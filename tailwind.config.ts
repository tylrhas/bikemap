import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /**
       * The type scale. Every size in the app comes from here — before this
       * there were eight arbitrary `text-[Npx]` values with no relationship to
       * each other, which made "one step smaller" a guess.
       *
       * Sizes only, no paired line-height: the arbitrary values they replace
       * inherited theirs, and pinning one here would shift existing layout.
       */
      fontFamily: {
        // Fraunces for trail names and section titles, used with restraint;
        // Public Sans for everything else. Both go through one variable each so
        // the Map appearance global can swap the whole stack, fallbacks
        // included — see `globals.css`.
        display: ['var(--app-font-display)'],
        sans: ['var(--app-font-body)'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        micro: '0.5625rem', // 9px  — chart axis labels
        meta: '0.6875rem', // 11px — stats, badges, uppercase labels
        ui: '0.8125rem', // 13px — secondary UI, list rows
        body: '0.9375rem', // 15px — trail names, running text
        title: '1.125rem', // 18px — panel and sheet headings
        display: '1.75rem', // 28px — the welcome modal
      },

      /**
       * The stacking order, named. The numbers are exactly what they were —
       * this step buys a readable name, not a renumbering. The map canvas sits
       * at `map` and anything drawn over it must be above that; see the Mapbox
       * overlay note in CLAUDE.md.
       */
      zIndex: {
        map: '500',
        'map-ui': '501',
        elevation: '600',
        toast: '800',
        'drawer-toggle': '900',
        drawer: '950',
        'drawer-toggle-open': '960',
        prompt: '2000',
        modal: '3000',
      },

      keyframes: {
        'location-pulse': {
          '0%': {
            transform: 'translate(-50%, -50%) scale(0.5)',
            opacity: '1',
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(2)',
            opacity: '0',
          },
        },
        'recording-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
          '50%': { boxShadow: '0 0 16px 6px rgba(239, 68, 68, 0.6)' },
        },
        'toast-slide-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'toast-fade-in': {
          from: {
            opacity: '0',
            transform: 'translateX(-50%) translateY(-10px)',
          },
          to: { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
        'toast-fade-out': {
          from: { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
          to: { opacity: '0', transform: 'translateX(-50%) translateY(-10px)' },
        },
        'welcome-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'welcome-fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'welcome-slide-up': {
          from: { opacity: '0', transform: 'translateY(40px) scale(0.95)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'welcome-slide-down': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(30px) scale(0.97)' },
        },
        'fade-in-out': {
          '0%': { opacity: '0' },
          '15%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'location-pulse': 'location-pulse 2s ease-out infinite',
        'recording-pulse': 'recording-pulse 3s ease-in-out infinite',
        'toast-slide-in': 'toast-slide-in 0.2s ease',
        'pulse-dot': 'pulse-dot 3s ease-in-out infinite',
        'toast-fade-in': 'toast-fade-in 0.3s ease-out',
        'toast-fade-out': 'toast-fade-out 0.3s ease-out forwards',
        'welcome-fade-in': 'welcome-fade-in 0.4s ease-out',
        'welcome-fade-out': 'welcome-fade-out 0.4s ease-in forwards',
        'welcome-slide-up': 'welcome-slide-up 0.45s ease-out',
        'welcome-slide-down': 'welcome-slide-down 0.35s ease-in forwards',
        'fade-in-out': 'fade-in-out 2s ease-in-out',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // The design brief's two: 8px on controls, 12px on cards.
        control: '8px',
        card: '12px',
      },
      colors: {
        // App brand colors
        // Channels, not hex, so opacity modifiers still resolve —
        // `ring-app-primary/30` becomes `rgb(var(--app-primary) / 0.3)`.
        // Defaults live in globals.css; the admin overrides them per
        // deployment via the Map appearance global.
        'app-primary': 'rgb(var(--app-primary) / <alpha-value>)',
        'app-secondary': 'rgb(var(--app-secondary) / <alpha-value>)',

        /**
         * COTA. `forest` and `clay` are the two the admin can edit — they are
         * the same variables as app-secondary and app-primary, named for what
         * the design calls them. The rest are fixed.
         */
        forest: 'rgb(var(--app-secondary) / <alpha-value>)',
        clay: 'rgb(var(--app-primary) / <alpha-value>)',
        'forest-lift': '#0A4536',
        coral: 'rgb(var(--app-accent) / <alpha-value>)',
        cream: 'rgb(var(--app-surface) / <alpha-value>)',
        ink: 'rgb(var(--app-ink) / <alpha-value>)',
        // Semantic, and deliberately not the accent: a condition being fine or
        // hazardous is not the same kind of information as an active control.
        good: '#4C8A69',
        warn: '#C25E3F',
        // Difficulty. Beginner and intermediate reuse good/clay per the brief.
        advanced: '#B5573B',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
