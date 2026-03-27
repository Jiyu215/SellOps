module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        light: {
          primary: '#5D5FEF',
          secondary: '#EDF0FF',
          background: '#F9F9FF',
          surface: '#FFFFFF',
          textPrimary: '#222222',
          textSecondary: '#666666',
          border: '#E0E0E0',
          success: '#28A745',
          error: '#DC3545',
          warning: '#FFC107',
          info: '#17A2B8',
        },
        dark: {
          primary: '#4A4DD1',
          secondary: '#1B1F2A',
          background: '#121212',
          surface: '#1E1E1E',
          textPrimary: '#E0E0E0',
          textSecondary: '#AAAAAA',
          border: '#2C2C2C',
          success: '#28A745',
          error: '#DC3545',
          warning: '#FFC107',
          info: '#17A2B8',
        },
      },
      spacing: {
        xs: '0.25rem',  // 4px
        sm: '0.5rem',   // 8px
        md: '1rem',     // 16px
        lg: '1.5rem',   // 24px
        xl: '2rem',     // 32px
        xxl: '3rem',    // 48px
        xxxl: '4rem',   // 64px
        huge: '6rem',   // 96px
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
        sm: '0 1px 3px rgba(0,0,0,0.1)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.15)',
        xl: '0 20px 25px rgba(0,0,0,0.2)',
      },
      fontFamily: {
        sans: ["'Pretendard'", "'Noto Sans KR'", 'sans-serif'],
      },
      fontSize: {
        h1: ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.5px' }],
        h2: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.5px' }],
        h3: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.25px' }],
        h4: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.25px' }],
        h5: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0px' }],
        h6: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0px' }],
        bodyLg: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0px' }],
        bodyMd: ['0.9375rem', { lineHeight: '1.375rem', letterSpacing: '0px' }],
        bodySm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0px' }],
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0px' }],
        overline: ['0.625rem', { lineHeight: '0.75rem', letterSpacing: '1px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};