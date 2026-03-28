/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Deep navy base — inspired by the reference
                navy: {
                    950: '#050a15',
                    900: '#0a1224',
                    800: '#0f1b35',
                    700: '#152444',
                    600: '#1c2f55',
                },
                // Teal/Cyan accent — medical + tech feel
                teal: {
                    50: '#e6fffe',
                    100: '#b3fffc',
                    200: '#80fff9',
                    300: '#4dfff6',
                    400: '#1afff3',
                    500: '#00e6d9',
                    600: '#00b3a8',
                    700: '#008077',
                    800: '#004d47',
                    900: '#001a18',
                },
                // Emerald for success/health
                mint: {
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                },
                // Surface colors for cards and backgrounds
                surface: {
                    50: '#f0f4f8',
                    100: '#d9e2ec',
                    200: '#bcccdc',
                    300: '#9fb3c8',
                    400: '#829ab1',
                    500: '#627d98',
                    600: '#486581',
                    700: '#334e68',
                    800: '#243b53',
                    900: '#102a43',
                    950: '#0a1929',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
                'mesh-gradient': 'linear-gradient(135deg, rgba(0,230,217,0.05) 0%, transparent 50%, rgba(16,185,129,0.05) 100%)',
            },
            animation: {
                'pulse-soft': 'pulseSoft 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'fade-in': 'fadeIn 0.5s ease-out',
                'glow-teal': 'glowTeal 2.5s ease-in-out infinite alternate',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(12px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                glowTeal: {
                    '0%': { boxShadow: '0 0 8px rgba(0,230,217,0.15), 0 0 20px rgba(0,230,217,0.05)' },
                    '100%': { boxShadow: '0 0 15px rgba(0,230,217,0.3), 0 0 40px rgba(0,230,217,0.1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
            },
            boxShadow: {
                'glow-sm': '0 0 10px rgba(0,230,217,0.15)',
                'glow-md': '0 0 20px rgba(0,230,217,0.2), 0 0 40px rgba(0,230,217,0.05)',
                'glow-lg': '0 0 30px rgba(0,230,217,0.25), 0 0 60px rgba(0,230,217,0.1)',
                'card': '0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
                'card-hover': '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0,230,217,0.08)',
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.25rem',
            },
        },
    },
    plugins: [],
}
