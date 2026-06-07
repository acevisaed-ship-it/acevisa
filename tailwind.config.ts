import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#E6E8E7',
        green: '#B7C733',
        orange: '#E48328',
        text: '#0A3F3A',
        blue: '#2083B9',
        black: '#000000',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
}

export default config
