/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				serif: ['"Noto Serif"', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
			},
			backgroundColor: {
				'surface': '#fcf9f4',
				'surface-low': '#f6f3ee',
				'surface-lowest': '#ffffff',
				'paper-light': '#fcf9f4',
				'paper': '#fcf9f4',
				'paper-dark': '#f6f3ee',
			},
			colors: {
				ink: '#1c1c19',
				klein: {
					DEFAULT: '#002FA7',
					light: '#1439af',
				},
				gold: {
					DEFAULT: '#D4AF37',
				},
				blush: {
					DEFAULT: '#FF91AF',
				},
				surface: {
					DEFAULT: '#fcf9f4',
					low: '#f6f3ee',
					lowest: '#ffffff',
				},
			},
			boxShadow: {
				'ambient': '0 12px 32px -4px rgba(28, 28, 25, 0.06)',
			},
			borderRadius: {
				DEFAULT: '8px',
				'md': '12px',
			},
		},
	},
	plugins: [],
}
