import { alpha, createTheme } from '@mui/material/styles'

const emerald = '#2f7f4f'
const emeraldLight = '#6bc486'
const emeraldDark = '#1f5c39'
const peach = '#ea8f73'
const peachLight = '#ffd4c6'
const peachDark = '#c9694d'
const sky = '#67b9c9'
const skyLight = '#d5f0f5'
const gold = '#d6a554'
const berry = '#ce6a7b'
const ink = '#1f342b'
const mutedInk = '#556f64'
const ivory = '#fff9f1'
const cloud = '#fffdf8'
const paper = 'rgba(255,255,255,0.88)'
const border = 'rgba(47,127,79,0.14)'

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: emerald,
            light: emeraldLight,
            dark: emeraldDark,
            contrastText: '#ffffff',
        },
        secondary: {
            main: peach,
            light: peachLight,
            dark: peachDark,
            contrastText: '#ffffff',
        },
        info: {
            main: sky,
            light: skyLight,
            dark: '#3d8a99',
            contrastText: ink,
        },
        success: {
            main: emerald,
            light: emeraldLight,
            dark: emeraldDark,
            contrastText: '#ffffff',
        },
        warning: {
            main: gold,
            light: '#f5dfb1',
            dark: '#b17e2f',
            contrastText: ink,
        },
        error: {
            main: berry,
            light: '#f4cad3',
            dark: '#a7495a',
            contrastText: '#ffffff',
        },
        background: {
            default: ivory,
            paper: cloud,
        },
        text: {
            primary: ink,
            secondary: mutedInk,
            disabled: 'rgba(31,52,43,0.4)',
        },
        divider: border,
    },
    typography: {
        fontFamily: '"Times New Roman", Times, serif',
        h1: { fontFamily: '"Times New Roman", Times, serif', fontSize: '3.2rem', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.94 },
        h2: { fontFamily: '"Times New Roman", Times, serif', fontSize: '2.55rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.98 },
        h3: { fontFamily: '"Times New Roman", Times, serif', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.04 },
        h4: { fontFamily: '"Times New Roman", Times, serif', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.08 },
        h5: { fontFamily: '"Times New Roman", Times, serif', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' },
        h6: { fontFamily: '"Times New Roman", Times, serif', fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' },
        subtitle1: { fontWeight: 800, color: ink },
        subtitle2: { fontFamily: '"Times New Roman", Times, serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: mutedInk },
        body1: { fontSize: '1rem', lineHeight: 1.72 },
        body2: { fontSize: '0.93rem', lineHeight: 1.66 },
        button: { fontFamily: '"Times New Roman", Times, serif', fontWeight: 800, letterSpacing: '0.01em', textTransform: 'none' },
        overline: { fontFamily: '"Times New Roman", Times, serif', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' },
    },
    shape: {
        borderRadius: 24,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                ':root': {
                    colorScheme: 'light',
                },
                html: {
                    backgroundColor: ivory,
                },
                body: {
                    fontFamily: '"Times New Roman", Times, serif',
                    background: `
                        radial-gradient(circle at 12% 8%, rgba(107,196,134,0.24) 0%, transparent 28%),
                        radial-gradient(circle at 88% 12%, rgba(234,143,115,0.16) 0%, transparent 22%),
                        radial-gradient(circle at 78% 92%, rgba(103,185,201,0.14) 0%, transparent 26%),
                        linear-gradient(180deg, #fffdf9 0%, #f6fbf5 50%, #fff7ef 100%)
                    `,
                    color: ink,
                    scrollbarColor: `${emerald} rgba(255,255,255,0.86)`,
                    '&::before': {
                        content: '""',
                        position: 'fixed',
                        inset: 0,
                        pointerEvents: 'none',
                        backgroundImage: `
                            radial-gradient(circle at 1px 1px, rgba(47,127,79,0.11) 1px, transparent 0),
                            repeating-linear-gradient(135deg, transparent 0, transparent 18px, rgba(234,143,115,0.06) 18px, rgba(234,143,115,0.06) 20px)
                        `,
                        backgroundSize: '26px 26px, auto',
                        opacity: 0.55,
                        zIndex: 0,
                    },
                    '&::after': {
                        content: '""',
                        position: 'fixed',
                        inset: 0,
                        pointerEvents: 'none',
                        background: `
                            radial-gradient(circle at 82% 16%, rgba(255,255,255,0.55) 0%, transparent 18%),
                            radial-gradient(circle at 14% 78%, rgba(223,243,227,0.36) 0%, transparent 20%)
                        `,
                        zIndex: 0,
                    },
                    '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                        width: 10,
                        height: 10,
                    },
                    '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                        borderRadius: 999,
                        backgroundColor: alpha(emerald, 0.72),
                        border: '2px solid rgba(255,255,255,0.82)',
                    },
                    '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: emeraldDark,
                    },
                    '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
                        backgroundColor: 'rgba(255,255,255,0.62)',
                    },
                    '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-label, & .MuiTab-root, & .MuiMenuItem-root, & .MuiFormLabel-root, & .MuiInputBase-input, & .MuiTableCell-root, & a, & button, & input, & textarea, & select': {
                        fontFamily: '"Times New Roman", Times, serif',
                    },
                    '& .MuiTypography-h1, & .MuiTypography-h2, & .MuiTypography-h3, & .MuiTypography-h4, & .MuiTypography-h5, & .MuiTypography-h6': {
                        fontFamily: '"Times New Roman", Times, serif',
                    },
                    '& .MuiTypography-overline, & .MuiTypography-subtitle2': {
                        fontFamily: '"Times New Roman", Times, serif',
                    },
                    '::selection': {
                        backgroundColor: alpha(peach, 0.28),
                        color: ink,
                    },
                },
                '#root': {
                    minHeight: '100vh',
                    position: 'relative',
                    zIndex: 1,
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    padding: '10px 22px',
                    fontWeight: 800,
                    boxShadow: 'none',
                    transition: 'transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, border-color 0.22s ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    },
                },
                containedPrimary: {
                    background: `linear-gradient(135deg, ${emerald} 0%, ${emeraldLight} 100%)`,
                    boxShadow: '0 18px 36px rgba(47,127,79,0.2)',
                    '&:hover': {
                        background: `linear-gradient(135deg, ${emeraldDark} 0%, ${emerald} 100%)`,
                        boxShadow: '0 20px 40px rgba(47,127,79,0.28)',
                    },
                },
                containedSecondary: {
                    background: `linear-gradient(135deg, ${peach} 0%, ${peachLight} 100%)`,
                    color: '#ffffff',
                    boxShadow: '0 18px 36px rgba(234,143,115,0.22)',
                    '&:hover': {
                        background: `linear-gradient(135deg, ${peachDark} 0%, ${peach} 100%)`,
                        boxShadow: '0 20px 40px rgba(234,143,115,0.28)',
                    },
                },
                outlined: {
                    borderColor: alpha(emerald, 0.28),
                    backgroundColor: alpha('#ffffff', 0.66),
                    color: emeraldDark,
                    '&:hover': {
                        borderColor: emerald,
                        backgroundColor: alpha(emerald, 0.08),
                    },
                },
                text: {
                    color: emeraldDark,
                    '&:hover': {
                        backgroundColor: alpha(emerald, 0.08),
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 30,
                    border: `1px solid ${border}`,
                    background: `linear-gradient(180deg, ${paper} 0%, rgba(255,250,244,0.92) 100%)`,
                    backgroundImage: 'none',
                    boxShadow: '0 24px 52px rgba(31,52,43,0.08)',
                    backdropFilter: 'blur(16px)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 28,
                    border: `1px solid ${border}`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(252,248,242,0.92) 100%)',
                    boxShadow: '0 20px 46px rgba(31,52,43,0.08)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: `1px solid ${alpha(emerald, 0.14)}`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,251,245,0.98) 58%, rgba(255,247,238,0.98) 100%)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    border: `1px solid ${alpha(emerald, 0.12)}`,
                    backdropFilter: 'blur(10px)',
                    fontWeight: 800,
                },
                filled: {
                    backgroundColor: alpha(emerald, 0.14),
                    color: emeraldDark,
                },
                outlined: {
                    backgroundColor: alpha('#ffffff', 0.64),
                },
            },
        },
        MuiAvatar: {
            styleOverrides: {
                root: {
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, rgba(107,196,134,0.24) 0%, rgba(234,143,115,0.24) 100%)',
                    color: emeraldDark,
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 22,
                    backgroundColor: alpha('#ffffff', 0.84),
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(emerald, 0.22),
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(emerald, 0.44),
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: emerald,
                        borderWidth: 2,
                    },
                },
                input: {
                    fontWeight: 700,
                },
            },
        },
        MuiFilledInput: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    backgroundColor: alpha(emerald, 0.08),
                    '&:before': {
                        borderBottomColor: alpha(emerald, 0.18),
                    },
                    '&:hover:not(.Mui-disabled, .Mui-error):before': {
                        borderBottomColor: alpha(emerald, 0.34),
                    },
                    '&.Mui-focused': {
                        backgroundColor: alpha(emerald, 0.12),
                    },
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontWeight: 800,
                    color: mutedInk,
                },
            },
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: mutedInk,
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 34,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,249,243,0.95) 100%)',
                    border: `1px solid ${alpha(emerald, 0.16)}`,
                    boxShadow: '0 30px 70px rgba(31,52,43,0.14)',
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontFamily: '"Times New Roman", Times, serif',
                    fontWeight: 800,
                    paddingBottom: 8,
                },
            },
        },
        MuiDialogActions: {
            styleOverrides: {
                root: {
                    padding: '20px 24px 24px',
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 24,
                    border: `1px solid ${alpha(emerald, 0.16)}`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,249,244,0.94) 100%)',
                    boxShadow: '0 22px 46px rgba(31,52,43,0.12)',
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    margin: '2px 6px',
                    fontWeight: 700,
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: {
                    height: 4,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${emerald} 0%, ${peach} 100%)`,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    minHeight: 46,
                    fontWeight: 800,
                    '&.Mui-selected': {
                        color: emeraldDark,
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: alpha(emerald, 0.1),
                },
                head: {
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: mutedInk,
                    backgroundColor: alpha(emerald, 0.07),
                },
                body: {
                    fontSize: '0.93rem',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: alpha(emerald, 0.04),
                    },
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 22,
                    border: `1px solid ${alpha(emerald, 0.14)}`,
                    boxShadow: '0 16px 30px rgba(31,52,43,0.08)',
                },
            },
        },
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: alpha(emerald, 0.12),
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: alpha(emerald, 0.1),
                },
                bar: {
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${emerald} 0%, ${peach} 100%)`,
                },
            },
        },
        MuiBadge: {
            styleOverrides: {
                badge: {
                    fontWeight: 800,
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.92)',
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    borderRadius: 14,
                    background: alpha(ink, 0.92),
                    fontSize: '0.78rem',
                    fontWeight: 700,
                },
            },
        },
    },
})
