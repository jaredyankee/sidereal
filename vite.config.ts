import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Everything runs client-side, so the site is prerendered to static files.
			// Swap to @sveltejs/adapter-netlify when we need serverless functions.
			adapter: adapter()
		})
	],
	test: {
		include: ['src/**/*.test.ts']
	}
});
