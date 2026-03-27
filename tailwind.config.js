/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
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
