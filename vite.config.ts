
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Prioritize API_KEY or GEMINI_API_KEY from the environment
    const apiKey = env.API_KEY || env.GEMINI_API_KEY || '';

    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // We define 'process.env' as a full object to satisfy SDKs and code expecting Node-like env access.
        // This ensures process.env.API_KEY is replaced correctly by the build tool.
        'process.env': {
          ...env,
          API_KEY: apiKey,
          GEMINI_API_KEY: apiKey
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
