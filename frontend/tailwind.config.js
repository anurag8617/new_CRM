/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"], .dark'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        sidebar: 'var(--bg-sidebar)',
        surface: 'var(--bg-surface)',
        raised: 'var(--bg-surface-raised)',
        sunken: 'var(--bg-surface-sunken)',
        elevated: 'var(--bg-elevated)',
        modal: 'var(--bg-modal)',
        hover: 'var(--bg-hover)',
        active: 'var(--bg-active)',
        selected: 'var(--bg-selected)',
        input: 'var(--bg-input)',
        fg: {
          DEFAULT: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          subtle: 'var(--text-tertiary)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
        },
        line: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          text: 'var(--accent-text)',
        },
        btn: {
          primary: {
            bg: 'var(--btn-primary-bg)',
            hover: 'var(--btn-primary-bg-hover)',
            text: 'var(--btn-primary-text)',
          },
          secondary: {
            bg: 'var(--btn-secondary-bg)',
            hover: 'var(--btn-secondary-bg-hover)',
            border: 'var(--btn-secondary-border)',
          }
        },
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        info: {
          DEFAULT: 'var(--info)',
          soft: 'var(--info-soft)',
        },
        // Pure neutral ChatGPT gray scale (Zero blue-black, solid opaque surfaces)
        slate: {
          50: '#f9f9f9',
          100: '#f4f4f4',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#8e8e8e',
          500: '#676767',
          600: '#525252',
          700: '#383838',
          750: '#333333',
          800: '#2a2a2a', /* solid elevated surface / dark input / subtle card */
          850: '#262626',
          900: '#2f2f2f', /* solid raised card surface (--bg-surface-raised) */
          950: '#212121', /* main canvas (--bg-app) */
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        }
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
    },
  },
  plugins: [],
};
