/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Texas A&M Official Colors
        'tamu-maroon': '#500000',
        'tamu-white': '#FFFFFF',
        'tamu-maroon-light': '#660000',
        'tamu-maroon-dark': '#3C0000',
        'tamu-gray': '#F5F5F5',
        'tamu-gray-dark': '#E5E5E5',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
