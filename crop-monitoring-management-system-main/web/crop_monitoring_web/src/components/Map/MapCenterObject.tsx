import { Box, Typography, alpha } from '@mui/material'

interface MapCenterObjectProps {
    color?: string
    label?: string
    size?: number
    zIndex?: number
}

export function MapCenterObject({
    color = '#1b5e20',
    label,
    size = 54,
    zIndex = 920,
}: MapCenterObjectProps) {
    const lineLength = Math.max(14, Math.round(size * 0.32))
    const dotSize = Math.max(10, Math.round(size * 0.18))

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box sx={{ position: 'relative', width: size, height: size }}>
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: `1.5px solid ${alpha(color, 0.5)}`,
                        boxShadow: `0 0 0 5px ${alpha(color, 0.08)}`,
                        bgcolor: alpha(color, 0.04),
                    }}
                />

                {[
                    { top: -lineLength, left: '50%', width: 2, height: lineLength, transform: 'translateX(-50%)' },
                    { bottom: -lineLength, left: '50%', width: 2, height: lineLength, transform: 'translateX(-50%)' },
                    { left: -lineLength, top: '50%', width: lineLength, height: 2, transform: 'translateY(-50%)' },
                    { right: -lineLength, top: '50%', width: lineLength, height: 2, transform: 'translateY(-50%)' },
                ].map((segment, index) => (
                    <Box
                        key={index}
                        sx={{
                            position: 'absolute',
                            borderRadius: 999,
                            bgcolor: alpha(color, 0.55),
                            boxShadow: `0 0 12px ${alpha(color, 0.18)}`,
                            ...segment,
                        }}
                    />
                ))}

                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: dotSize,
                        height: dotSize,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        bgcolor: '#ffffff',
                        border: `2px solid ${color}`,
                        boxShadow: `0 0 0 4px ${alpha(color, 0.12)}`,
                    }}
                />

                {label && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: `calc(100% + 18px)`,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            px: 1.2,
                            py: 0.55,
                            borderRadius: '999px',
                            bgcolor: alpha('#ffffff', 0.9),
                            border: `1px solid ${alpha(color, 0.18)}`,
                            boxShadow: '0 10px 30px rgba(21,31,24,0.08)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: '0.52rem',
                                lineHeight: 1,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                fontFamily: '"Times New Roman", Times, serif',
                                fontWeight: 700,
                                color,
                            }}
                        >
                            {label}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
