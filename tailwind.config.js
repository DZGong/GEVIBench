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
				serif: ['"Source Serif 4"', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
			},
			colors: {
				primary: {
					DEFAULT: '#2B5D3A',
				},
				secondary: {
					DEFAULT: '#4A90E2',
				},
				accent: {
					DEFAULT: '#F5A623',
				},
			},
		},
	},
	plugins: [],
}
