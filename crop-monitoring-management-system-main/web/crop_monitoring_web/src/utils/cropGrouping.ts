export type AreaCropGroup = 'Sugarcane' | 'Break Crop' | 'Fallow Period' | 'Unspecified'

export const FALLOW_PERIOD_CROP_CLASS_LABEL = 'Fallow Period'

const BREAK_CROP_PATTERN = /break\s*crop|breakcrop|soyabeans?|sugarbeans?|sunn\s*hemp|velvet\s*beans?|maize|legumes?/i
const FALLOW_PATTERN = /fallow|furrow|fullow/i
const FALLOW_WITH_NONE_PATTERN = /fallow|furrow|fullow|\bnone\b/i
const SUGARCANE_PATTERN = /sugar\s*cane|plant\s*cane|\bratoon\b|\bcane\b/i

export function getAreaCropGroup(
    value?: string | null,
    options?: { treatNoneAsFallow?: boolean }
): AreaCropGroup {
    const normalized = (value ?? '').trim()

    if (!normalized) return 'Unspecified'
    if (BREAK_CROP_PATTERN.test(normalized)) return 'Break Crop'
    if ((options?.treatNoneAsFallow ? FALLOW_WITH_NONE_PATTERN : FALLOW_PATTERN).test(normalized)) return 'Fallow Period'
    if (SUGARCANE_PATTERN.test(normalized)) return 'Sugarcane'
    return 'Unspecified'
}

export function normalizeFallowCropClassLabel(value?: string | null): string {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')

    if (!normalized) return ''

    return getAreaCropGroup(normalized, { treatNoneAsFallow: true }) === 'Fallow Period'
        ? FALLOW_PERIOD_CROP_CLASS_LABEL
        : normalized
}
