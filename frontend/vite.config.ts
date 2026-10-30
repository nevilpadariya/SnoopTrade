import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        target: 'es2020',
        rollupOptions: {
            output: {
                // Vite 8 uses Rolldown; select chunks with its function API.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;
                    if (id.includes('recharts')) return 'vendor-charts';
                    if (id.includes('react-router')) return 'vendor-router';
                    if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
                },
            },
        },
    },
});
