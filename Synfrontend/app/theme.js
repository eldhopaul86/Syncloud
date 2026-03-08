// SynCloud Design System

const Common = {
    radius: {
        card: 4,
        pill: 4,
        button: 4,
        bottomNav: 8,
        sm: 4,
        xs: 2,
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    shadow: {
        card: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 6,
        },
    }
};

export const Colors = {
    dark: true,
    // Backgrounds
    bgPrimary: '#0D0D0D',
    bgCard: '#1A1A1A',
    bgCard2: '#141414',
    bgCardBorder: '#2A2A2A',

    // Accents
    accentPrimary: '#00E676', // Restore Green
    accentSecondary: '#00BCD4', // Cyan
    accentTertiary: '#FFB300', // Amber

    // Pastels (for Cards)
    pastelPurple: { bg: '#F3F0FF', icon: '#D0C3FF', text: '#6C63FF' },
    pastelGreen: { bg: '#E8F7F0', icon: '#C2EBD3', text: '#00C853' },
    pastelBlue: { bg: '#E3F2FD', icon: '#B3E5FC', text: '#039BE5' },
    pastelOrange: { bg: '#FFF3E0', icon: '#FFE082', text: '#FF6F00' },

    // Gradients
    gradPrimary: ['#0f3325', '#004d40', '#00695c'], // Hero Card (Dark Green)
    gradCard: ['#00E676', '#00BCD4'], // Cloud Card (Bright Green -> Cyan)

    // Text
    textPrimary: '#F5F5F5',
    textMuted: '#9E9E9E',
    textDim: '#555555',

    // Status
    danger: '#FF5252',
    success: '#00E676',
    warning: '#FFB300',
    info: '#00BCD4',

    // Utilities
    overlay: 'rgba(0, 230, 118, 0.1)', // Green overlay
    glassLight: 'rgba(255,255,255,0.04)',
};

export const ColorsLight = {
    dark: false,
    // Backgrounds
    bgPrimary: '#F8F9FA',
    bgCard: '#FFFFFF',
    bgCard2: '#F1F3F5',
    bgCardBorder: '#E9ECEF',

    // Accents (Synced with Dark Mode Green)
    accentPrimary: '#00C853', // Stronger Green for light mode contrast
    accentSecondary: '#0097A7', // Darker Cyan
    accentTertiary: '#FF8F00', // Darker Amber

    // Pastels (for Cards - Light Mode)
    pastelPurple: { bg: '#F3F0FF', icon: '#E0D9FF', text: '#5D5FEF' },
    pastelGreen: { bg: '#E8F5E9', icon: '#C8E6C9', text: '#2E7D32' },
    pastelBlue: { bg: '#E3F2FD', icon: '#BBDEFB', text: '#1976D2' },
    pastelOrange: { bg: '#FFF3E0', icon: '#FFE0B2', text: '#E65100' },

    // Gradients (Green-Teal tones)
    gradPrimary: ['#00C853', '#009688'],
    gradCard: ['#00E676', '#00BCD4'],

    // Text
    textPrimary: '#1A1A1A',
    textMuted: '#5F6368', // Google-style grey for better readability
    textDim: '#80868B',

    // Status
    danger: '#D32F2F',
    success: '#388E3C',
    warning: '#FBC02D',
    info: '#0097A7',

    // Utilities
    overlay: 'rgba(0, 200, 83, 0.08)',
    glassLight: 'rgba(0,0,0,0.03)',
};

export const Typography = {
    heading1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    heading2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    heading3: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '400' },
    bodyMuted: { fontSize: 14, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '400' },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    stat: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
};

export const Radius = Common.radius;
export const Spacing = Common.spacing;
export const Shadow = Common.shadow;
