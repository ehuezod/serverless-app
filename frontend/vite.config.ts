import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In production, /config.json is written into the deployed bucket by the
// CDK stack's BucketDeployment (see lib/serverless-app-stack.ts). It doesn't
// exist in local dev, so this serves a stand-in only for `vite dev` — never
// bundled into `vite build` output.
function devConfigJson() {
    return {
        name: 'dev-config-json',
        configureServer(server: import('vite').ViteDevServer) {
            server.middlewares.use((req, res, next) => {
                if (req.url === '/config.json') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ apiUrl: 'http://localhost:4000/' }));
                    return;
                }
                next();
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), devConfigJson()],
    build: {
        outDir: 'dist',
    },
    test: {
        environment: 'jsdom',
        globals: true,
    },
});
