export default {
	content: [
		'./src/**/*.{html,svelte,ts,js}',
		'./node_modules/@skeletonlabs/skeleton-svelte/dist/**/*.{js,svelte}'
	],
	theme: {
		extend: {}
	},
	plugins: [require('@tailwindcss/forms')]
};
