import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'node',
		globals: false,
		include: ['src/**/__tests__/**/*.test.ts']
	}
});
