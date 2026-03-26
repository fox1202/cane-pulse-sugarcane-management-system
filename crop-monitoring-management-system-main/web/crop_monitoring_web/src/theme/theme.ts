import { alpha, createTheme } from '@mui/material/styles'

const primary = '#56b870'
const primaryLight = '#a6e2b8'
const primaryDark = '#2f7f4f'
const secondary = '#f4a28c'
const secondaryLight = '#ffd7cb'
const secondaryDark = '#de7c64'
const info = '#79c7be'
const warning = '#f0bf68'
const error = '#db7682'
const cream = '#fffaf3'
const paper = '#ffffff'
const ink = '#234034'
const mist = '#607a70'

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: primary,
            light: primaryLight,
            dark: primaryDark,
            contrastText: '#ffffff',
        },
        secondary: {
            main: secondary,
            light: secondaryLight,
            dark: secondaryDark,
            contrastText: '#ffffff',
        },
        info: {
            main: info,
            light: '#bfe9e2',
            dark: '#4f9c96',
            contrastText: ink,
        },
        success: {
            main: primary,
            light: primaryLight,
            dark: primaryDark,
            contrastText: '#ffffff',
        },
        warning: {
            main: warning,
            light: '#f8dfae',
            dark: '#ce9c44',
            contrastText: ink,
        },
        error: {
            main: error,
            light: '#f3bec6',
            dark: '#bc5564',
            contrastText: '#ffffff',
        },
        background: {
            default: cream,
            paper,
        },
        text: {
            primary: ink,
            secondary: mist,
            disabled: 'rgba(35,64,52,0.42)',
        },
        divider: 'rgba(86,184,112,0.18)',
    },
    typography: {
        fontFamily: '"Times New Roman", Times, serif',
        h1: { fontFamily: '"Times New Roman", Times, serif', fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em' },
        h2: { fontFamily: '"Times New Roman", Times, serif', fontSize: '2.3rem', fontWeight: 800, letterSpacing: '-0.02em' },
        h3: { fontFamily: '"Times New Roman", Times, serif', fontSize: '1.95rem', fontWeight: 700, letterSpacing: '-0.01em' },
        h4: { fontFamily: '"Times New Roman", Times, serif', fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.01em' },
        h5: { fontFamily: '"Times New Roman", Times, serif', fontSize: '1.25rem', fontWeight: 700 },
        h6: { fontFamily: '"Times New Roman", Times, serif', fontSize: '1rem', fontWeight: 700 },
        subtitle1: { fontWeight: 700, color: ink },
        body1: { fontSize: '1rem', lineHeight: 1.68 },
        body2: { fontSize: '0.92rem', lineHeight: 1.62 },
        button: { fontFamily: '"Times New Roman", Times, serif', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'none' },
        overline: { fontFamily: '"Times New Roman", Times, serif', fontWeight: 700, letterSpacing: '0.08em' },
    },
    shape: {
        borderRadius: 24,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                html: {
                    backgroundColor: cream,
                },
                body: {
                    position: 'relative',
                    fontFamily: '"Times New Roman", Times, serif',
                    background: `
                        radial-gradient(circle at 14% 10%, rgba(166,226,184,0.48) 0%, transparent 32%),
                        radial-gradient(circle at 88% 12%, rgba(244,162,140,0.2) 0%, transparent 22%),
                        radial-gradient(circle at 82% 92%, rgba(86,184,112,0.2) 0%, transparent 26%),
                        linear-gradient(180deg, #fffefb 0%, #f7fff8 54%, #fff8f1 100%)
                    `,
                    color: ink,
                    scrollbarColor: `${primary} rgba(255,255,255,0.78)`,
                    '&::before': {
                        content: '""',
                        position: 'fixed',
                        inset: 0,
                        pointerEvents: 'none',
                        backgroundImage: `
                            radial-gradient(circle at 1px 1px, rgba(86,184,112,0.12) 1px, transparent 0),
                            radial-gradient(circle at 1px 1px, rgba(244,162,140,0.1) 1px, transparent 0)
                        `,
                        backgroundSize: '28px 28px, 40px 40px',
                        backgroundPosition: '0 0, 16px 12px',
                        opacity: 0.45,
                        zIndex: 0,
                    },
                    '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                        width: 10,
                        height: 10,
                    },
                    '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                        borderRadius: 999,
                        backgroundColor: alpha(primary, 0.78),
                        border: '2px solid rgba(255,255,255,0.78)',
                    },
                    '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: primaryDark,
                    },
                    '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
                        backgroundColor: 'rgba(255,255,255,0.62)',
                    },
                    '::selection': {
                        backgroundColor: alpha(secondary, 0.34),
                        color: ink,
                    },
                    '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-label, & .MuiTab-root, & .MuiMenuItem-root, & .MuiFormLabel-root, & .MuiInputBase-input, & .MuiTableCell-root, & a, & button, & input, & textarea, & select': {
                        fontFamily: '"Times New Roman", Times, serif',
                    },
                    '& .MuiTypography-root, & .MuiButton-root, & .MuiChip-label, & .MuiTableCell-root, & a': {
                        textShadow: '0 0 0.35px currentColor',
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
                    fontFamily: '"Times New Roman", Times, serif',
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: '10px 22px',
                    transition: 'transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, border-color 0.22s ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    },
                },
                containedPrimary: {
                    background: `linear-gradient(135deg, ${primary} 0%, ${primaryLight} 100%)`,
                    boxShadow: '0 16px 34px rgba(86,184,112,0.2)',
                    '&:hover': {
                        background: `linear-gradient(135deg, ${primaryDark} 0%, ${primary} 100%)`,
                        boxShadow: '0 18px 38px rgba(86,184,112,0.28)',
                    },
                },
                containedSecondary: {
                    background: `linear-gradient(135deg, ${secondary} 0%, ${secondaryLight} 100%)`,
                    color: ink,
                    boxShadow: '0 16px 34px rgba(244,162,140,0.22)',
                    '&:hover': {
                        background: `linear-gradient(135deg, ${secondaryDark} 0%, ${secondary} 100%)`,
                        color: '#ffffff',
                        boxShadow: '0 18px 38px rgba(244,162,140,0.3)',
                    },
                },
                outlined: {
                    borderColor: alpha(primary, 0.34),
                    backgroundColor: alpha('#ffffff', 0.58),
                    color: primaryDark,
                    '&:hover': {
                        borderColor: primary,
                        backgroundColor: alpha(primary, 0.08),
                    },
                },
                text: {
                    color: primaryDark,
                    '&:hover': {
                        backgroundColor: alpha(primary, 0.08),
                    },
                },
            },
        },
        MuiTypography: {
            styleOverrides: {
                root: {
                    fontFamily: '"Times New Roman", Times, serif',
                },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    fontFamily: '"Times New Roman", Times, serif',
                },
                input: {
                    fontFamily: '"Times New Roman", Times, serif',
                    fontWeight: 600,
                },
            },
        },
        MuiFormLabel: {
            styleOverrides: {
                root: {
                    fontFamily: '"Times New Roman", Times, serif',
                    fontWeight: 700,
                },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    fontFamily: '"Times New Roman", Times, serif',
                    fontWeight: 600,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 28,
                    border: `1px solid ${alpha(primary, 0.16)}`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,250,244,0.94) 100%)',
                    backgroundImage: 'none',
                    boxShadow: '0 22px 40px rgba(35,64,52,0.08)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 28,
                    border: `1px solid ${alpha(primary, 0.16)}`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,248,242,0.96) 100%)',
                    boxShadow: '0 18px 38px rgba(35,64,52,0.08)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,248,242,0.9) 100%)',
                    backdropFilter: 'blur(16px)',
                    borderBottom: `1px solid ${alpha(primary, 0.14)}`,
                    boxShadow: '0 10px 28px rgba(35,64,52,0.06)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: `1px solid ${alpha(primary, 0.16)}`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,255,249,0.98) 68%, rgba(255,247,238,0.98) 100%)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    border: `1px solid ${alpha(primary, 0.16)}`,
                    backdropFilter: 'blur(10px)',
                },
                filled: {
                    backgroundColor: alpha(primary, 0.14),
                    color: primaryDark,
                },
                outlined: {
                    backgroundColor: alpha('#ffffff', 0.6),
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    backgroundColor: alpha('#ffffff', 0.82),
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(primary, 0.24),
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(primary, 0.46),
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: primary,
                        borderWidth: 2,
                    },
                },
            },
        },
        MuiFilledInput: {
            styleOverrides: {
                root: {
                    borderRadius: 18,
                    backgroundColor: alpha(primary, 0.08),
                    '&:before': {
                        borderBottomColor: alpha(primary, 0.16),
                    },
                    '&:hover:not(.Mui-disabled, .Mui-error):before': {
                        borderBottomColor: alpha(primary, 0.32),
                    },
                    '&.Mui-focused': {
                        backgroundColor: alpha(primary, 0.12),
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 30,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,244,0.96) 100%)',
                    border: `1px solid ${alpha(primary, 0.16)}`,
                    boxShadow: '0 28px 54px rgba(35,64,52,0.12)',
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: {
                    height: 4,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    fontFamily: '"Times New Roman", Times, serif',
                    borderRadius: 999,
                    minHeight: 44,
                    fontWeight: 700,
                    '&.Mui-selected': {
                        color: primaryDark,
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: alpha(primary, 0.12),
                },
                head: {
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: ink,
                    backgroundColor: alpha(primary, 0.07),
                },
                body: {
                    fontSize: '0.92rem',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: alpha(primary, 0.04),
                    },
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: alpha(primary, 0.1),
                },
                bar: {
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    border: `1px solid ${alpha(primary, 0.14)}`,
                },
            },
        },
    },
})
