import { readFileSync } from 'fs'
import process from 'process'
import { createClient } from '@supabase/supabase-js'

const VALID_ROLES = new Set(['collector', 'supervisor', 'admin'])
const VALID_STATUSES = new Set(['pending', 'approved', 'rejected'])

function loadDotEnv(path = './.env') {
    try {
        const raw = readFileSync(path, 'utf8')
        raw.split(/\r?\n/).forEach((line) => {
            const match = line.match(/^\s*([^#=\s]+)=(.*)$/)
            if (!match) return

            let value = match[2].trim()
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1)
            }

            process.env[match[1]] = value
        })
    } catch {
        // Ignore missing .env files.
    }
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeRole(value) {
    const normalizedValue = typeof value === 'string'
        ? value.trim().toLowerCase().replace(/[\s-]+/g, '_')
        : ''

    if (normalizedValue === 'administrator' || normalizedValue === 'system_administrator') {
        return 'admin'
    }

    if (normalizedValue === 'regional_supervisor') {
        return 'supervisor'
    }

    if (normalizedValue === 'user' || normalizedValue === 'users') {
        return 'collector'
    }

    return VALID_ROLES.has(normalizedValue) ? normalizedValue : null
}

function normalizeStatus(value) {
    return VALID_STATUSES.has(value) ? value : null
}

function parseArgs(argv) {
    const args = {
        dryRun: false,
        help: false,
        emails: [],
    }

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index]

        if (arg === '--dry-run') {
            args.dryRun = true
            continue
        }

        if (arg === '--help' || arg === '-h') {
            args.help = true
            continue
        }

        if (arg === '--email') {
            const nextValue = argv[index + 1]
            if (!nextValue || nextValue.startsWith('--')) {
                throw new Error('Expected an email address after --email')
            }

            args.emails.push(normalizeEmail(nextValue))
            index += 1
            continue
        }

        throw new Error(`Unknown argument: ${arg}`)
    }

    args.emails = Array.from(new Set(args.emails.filter(Boolean)))
    return args
}

function printHelp() {
    console.log(`
Approve pending profiles and confirm waiting Supabase auth users.

Usage:
  node scripts/approve-pending-users.mjs [--dry-run] [--email you@example.com]

Options:
  --dry-run          Show what would change without writing anything.
  --email <address>  Limit approval to a specific email. Repeat to target more than one user.
  --help, -h         Show this help message.

Environment:
  VITE_SUPABASE_URL           Required
  SUPABASE_SERVICE_ROLE_KEY   Required
`)
}

function getNameParts(user) {
    const metadata = typeof user.user_metadata === 'object' && user.user_metadata !== null
        ? user.user_metadata
        : {}

    let firstName = typeof metadata.first_name === 'string' ? metadata.first_name.trim() : ''
    let lastName = typeof metadata.last_name === 'string' ? metadata.last_name.trim() : ''

    if ((!firstName || !lastName) && typeof metadata.full_name === 'string') {
        const parts = metadata.full_name
            .trim()
            .split(/\s+/)
            .filter(Boolean)

        if (!firstName) {
            firstName = parts[0] || ''
        }

        if (!lastName) {
            lastName = parts.slice(1).join(' ')
        }
    }

    if (!firstName) {
        const emailPrefix = (user.email || '').split('@')[0]?.trim() || 'Pending'
        firstName = emailPrefix
    }

    if (!lastName) {
        lastName = 'User'
    }

    return { firstName, lastName }
}

function getEffectiveRole(user, profile) {
    return normalizeRole(profile?.role)
        || normalizeRole(user?.user_metadata?.role)
        || 'collector'
}

function isEmailConfirmed(user) {
    return Boolean(user?.email_confirmed_at || user?.confirmed_at)
}

async function listAllUsers(adminClient) {
    const users = []
    const perPage = 200

    for (let page = 1; ; page += 1) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })

        if (error) {
            throw error
        }

        const batch = data?.users || []
        users.push(...batch)

        if (batch.length < perPage) {
            break
        }
    }

    return users
}

function matchesEmailFilter(emailFilters, email) {
    if (emailFilters.size === 0) {
        return true
    }

    return emailFilters.has(normalizeEmail(email))
}

async function main() {
    loadDotEnv('./.env')

    const args = parseArgs(process.argv.slice(2))
    if (args.help) {
        printHelp()
        return
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
            'Add the service-role key to .env before running this script.'
        )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    const emailFilters = new Set(args.emails)

    const [authUsers, profilesResponse] = await Promise.all([
        listAllUsers(adminClient),
        adminClient
            .from('profiles')
            .select('id,email,first_name,last_name,role,status,created_at')
            .order('created_at', { ascending: false }),
    ])

    if (profilesResponse.error) {
        throw profilesResponse.error
    }

    const profiles = profilesResponse.data || []
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
    const profileByEmail = new Map(
        profiles
            .filter((profile) => normalizeEmail(profile.email))
            .map((profile) => [normalizeEmail(profile.email), profile])
    )

    const candidates = []
    const skippedRejected = []
    const skippedMismatchedProfiles = []

    for (const user of authUsers) {
        if (!matchesEmailFilter(emailFilters, user.email)) {
            continue
        }

        const directProfile = profileById.get(user.id) || null
        const emailProfile = user.email ? profileByEmail.get(normalizeEmail(user.email)) || null : null

        if (!directProfile && emailProfile && emailProfile.id !== user.id) {
            skippedMismatchedProfiles.push({
                authUserId: user.id,
                authEmail: user.email || '',
                profileId: emailProfile.id,
                profileEmail: emailProfile.email,
            })
            continue
        }

        const profile = directProfile || emailProfile
        const profileStatus = normalizeStatus(profile?.status)
        const metadataStatus = normalizeStatus(user.user_metadata?.status)
        const waitingConfirmation = Boolean(user.email) && !isEmailConfirmed(user)

        if (profileStatus === 'rejected') {
            skippedRejected.push(user.email || user.id)
            continue
        }

        if (
            profileStatus === 'pending' ||
            waitingConfirmation ||
            (!profile && metadataStatus === 'pending')
        ) {
            candidates.push({
                user,
                profile,
                waitingConfirmation,
            })
        }
    }

    const orphanPendingProfiles = profiles
        .filter((profile) => profile.status === 'pending')
        .filter((profile) => matchesEmailFilter(emailFilters, profile.email))
        .filter((profile) => !authUsers.some((user) => user.id === profile.id))

    if (candidates.length === 0) {
        console.log('No approvable pending or unconfirmed users were found.')

        if (orphanPendingProfiles.length > 0) {
            console.log(`Found ${orphanPendingProfiles.length} pending profile row(s) without matching auth users:`)
            orphanPendingProfiles.forEach((profile) => {
                console.log(`- ${profile.email} (${profile.id})`)
            })
        }

        if (skippedMismatchedProfiles.length > 0) {
            console.log(`Skipped ${skippedMismatchedProfiles.length} mismatched profile row(s):`)
            skippedMismatchedProfiles.forEach((item) => {
                console.log(`- auth ${item.authEmail} (${item.authUserId}) <-> profile ${item.profileEmail} (${item.profileId})`)
            })
        }

        return
    }

    console.log(
        `${args.dryRun ? 'Dry run:' : 'Applying changes to'} ${candidates.length} user(s)` +
        (emailFilters.size > 0 ? ` filtered by ${Array.from(emailFilters).join(', ')}` : '')
    )

    const summary = {
        profilesCreated: 0,
        profilesApproved: 0,
        authUsersConfirmed: 0,
        authMetadataUpdated: 0,
    }

    for (const candidate of candidates) {
        const { user, profile, waitingConfirmation } = candidate
        const email = user.email || '(no email)'
        const role = getEffectiveRole(user, profile)
        const { firstName, lastName } = getNameParts(user)
        const fullName = `${firstName} ${lastName}`.trim()

        console.log(`- ${email}`)

        if (!profile) {
            console.log('  creating missing profile and marking it approved')

            if (!args.dryRun) {
                const { error } = await adminClient.from('profiles').insert({
                    id: user.id,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    role,
                    status: 'approved',
                    is_active: true,
                })

                if (error) {
                    throw error
                }
            }

            summary.profilesCreated += 1
        } else if (profile.status === 'pending') {
            console.log('  updating profile status from pending to approved')

            if (!args.dryRun) {
                const { error } = await adminClient
                    .from('profiles')
                    .update({ status: 'approved', role, is_active: true })
                    .eq('id', profile.id)

                if (error) {
                    throw error
                }
            }

            summary.profilesApproved += 1
        }

        const nextUserMetadata = {
            ...(typeof user.user_metadata === 'object' && user.user_metadata !== null ? user.user_metadata : {}),
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            role,
            status: 'approved',
        }

        console.log(
            waitingConfirmation
                ? '  confirming auth email and updating metadata'
                : '  updating auth metadata to status=approved'
        )

        if (!args.dryRun) {
            const { error } = await adminClient.auth.admin.updateUserById(user.id, {
                email_confirm: waitingConfirmation ? true : undefined,
                user_metadata: nextUserMetadata,
            })

            if (error) {
                throw error
            }
        }

        if (waitingConfirmation) {
            summary.authUsersConfirmed += 1
        }

        summary.authMetadataUpdated += 1
    }

    console.log('')
    console.log('Summary')
    console.log(`- profiles created: ${summary.profilesCreated}`)
    console.log(`- profiles approved: ${summary.profilesApproved}`)
    console.log(`- auth emails confirmed: ${summary.authUsersConfirmed}`)
    console.log(`- auth metadata updated: ${summary.authMetadataUpdated}`)

    if (skippedRejected.length > 0) {
        console.log(`- skipped rejected users: ${skippedRejected.length}`)
    }

    if (orphanPendingProfiles.length > 0) {
        console.log(`- orphan pending profiles: ${orphanPendingProfiles.length}`)
    }

    if (skippedMismatchedProfiles.length > 0) {
        console.log(`- skipped mismatched profiles: ${skippedMismatchedProfiles.length}`)
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
