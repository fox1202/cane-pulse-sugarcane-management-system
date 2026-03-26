import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadDotEnv(path = './.env') {
  try {
    const raw = readFileSync(path, 'utf8')
    raw.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([^#=\s]+)=(.*)$/)
      if (m) {
        let v = m[2].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        process.env[m[1]] = v
      }
    })
  } catch (e) {
    // ignore
  }
}

loadDotEnv('./.env')

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(2)
}

const supabase = createClient(url, key)

async function main() {
  try {
    console.log('Running role update script...')

    // ---- role update example ----
    const targetEmail = 'nelson.murerwa@students.uz.ac.zw';
    console.log(`Updating role for ${targetEmail} to 'collector'`);
    // try find in profiles table first
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,email')
        .eq('email', targetEmail)
        .single();

    if (profileError && !profileData) {
        console.log('no profile row, querying auth.users')
        const { data: authData, error: authError } = await supabase
            .from('users')
            .select('id,email,user_metadata')
            .eq('email', targetEmail)
            .single();
        console.log('auth.users query', authData, authError)
    }

    if (profileError) {
        console.error('Error fetching profile:', profileError);
    } else if (profileData) {
        console.log('Current profile:', profileData);
        const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'collector' })
            .eq('id', profileData.id);
        if (updateError) {
            console.error('Error updating role:', updateError);
        } else {
            console.log('Updated profile role:', updateData);
        }
    }

  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(4)
  }
}

main()
