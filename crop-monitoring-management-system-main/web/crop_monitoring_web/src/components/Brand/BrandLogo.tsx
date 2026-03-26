import { Box } from '@mui/material'
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH } from '@/branding/brand'

export interface BrandLogoProps {
  size?: number
  borderRadius?: number | string
}

export function BrandLogo({ size = 40, borderRadius = 12 }: BrandLogoProps) {
  return (
    <Box
      component="img"
      src={BRAND_LOGO_PATH}
      alt={BRAND_LOGO_ALT}
      sx={{
        display: 'block',
        height: size,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        borderRadius,
        filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.18))',
      }}
    />
  )
}
