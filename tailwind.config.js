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
				'surface': '#f5f0e8',
				'surface-low': '#fdfcfa',
				'surface-lowest': '#ffffff',
				'paper-light': '#f5f0e8',
				'paper': '#f5f0e8',
				'paper-dark': '#fdfcfa',
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
					DEFAULT: '#f5f0e8',
					low: '#fdfcfa',
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
