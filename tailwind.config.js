/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				serif: ['DM Serif Display', 'ui-serif', 'Georgia', 'serif'],
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
				// Arena.ai warm palette
				warm: {
					bg: '#fcfaf8',
					surface: '#ffffff',
					border: '#edebe9',
					text: '#2e2b29',
					muted: '#857f7b',
					accent: '#f5efe8',
				},
			},
		},
	},
	plugins: [],
}
