import type { Config } from 'tailwindcss';

const preset = {
  theme: {
    extend: {
      colors: {
        background: '#f8f9fb',
        'surface-lowest': '#ffffff',
        'surface-low': '#f2f4f6',
        surface: '#edeef0',
        'surface-high': '#e7e8ea',
        'surface-highest': '#e1e2e4',
        'on-surface': '#191c1e',
        'on-surface-variant': '#4c4546',
        outline: '#7e7576',
        primary: '#000000',
        'primary-container': '#1b1b1b',
        secondary: '#184fd6',
        'secondary-container': '#3d6af0',
        'secondary-fixed': '#dce1ff',
        'on-secondary-fixed-variant': '#003ab1',
        success: '#1a9e5c',
        'success-container': '#e3f5ea',
        'on-success-container': '#146c2e',
        warning: '#e6a700',
        'warning-container': '#fff4d6',
        'on-warning-container': '#8a5a00',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        whatsapp: '#25d366',
      },
      borderRadius: {
        // antislop §3.3: fungsional <= 12px, makro <= 16px, hero/CTA 24px
        button: '0.5rem', // 8px
        card: '0.75rem', // 12px
        'card-lg': '1rem', // 16px — modal/sheet/hero card
        cta: '1.5rem', // 24px — hero search, CTA gelap
      },
      boxShadow: {
        // antislop §3.2: blur <= 16px, opacity <= 0.15
        card: '0 1px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        action: '0 2px 6px rgba(24, 79, 214, 0.12)',
        topbar: '0 1px 8px rgba(0, 0, 0, 0.04)',
        'bottom-tab': '0 -2px 12px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        eyebrow: '0.08em',
      },
      fontSize: {
        'display-lg': [
          '3rem',
          { lineHeight: '3.75rem', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'headline-lg': [
          '2rem',
          { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'headline-lg-mobile': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'headline-md': [
          '1.5rem',
          { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        title: ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],
        stat: ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'body-md': ['0.875rem', { lineHeight: '1.3125rem', fontWeight: '400' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' }],
        caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
      },
      spacing: {
        gutter: '1.5rem',
        'margin-mobile': '1.25rem',
        'margin-desktop': '4rem',
        'container-max': '80rem',
      },
    },
  },
} satisfies Pick<Config, 'theme'>;

export default preset;
