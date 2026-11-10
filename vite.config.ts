
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Local Gemini API middleware (development only)
const localGeminiApiPlugin: Plugin = {
  name: 'local-gemini-api-middleware',
  apply: 'serve',

  configureServer(server) {
    server.middlewares.use('/api/gemini', (req, res) => {
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.statusCode = 200;
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
      }

      let body = '';

      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        res.setHeader('Content-Type', 'application/json');

        try {
          const parsed = JSON.parse(body || '{}');
          const question = parsed.question || '';

          const apiKey =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY;

          if (
            !apiKey ||
            apiKey === 'MY_GEMINI_API_KEY' ||
            apiKey.includes('placeholder')
          ) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                answer:
                  'Kinfolk is a private, lightweight family messenger. Configure GEMINI_API_KEY to enable live Gemini responses.',
                source: 'local_fallback',
              })
            );
            return;
          }

          const genAI = new GoogleGenerativeAI(apiKey);

          const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction:
              'You are the Kinfolk Family Assistant, a helpful and respectful in-app guide for the Kinfolk private family messenger. Respond warmly, concisely, and clearly in plain text. You have zero access to private family chats.',
          });

          const result = await model.generateContent(question);
          const answer = result.response.text();

          res.statusCode = 200;
          res.end(
            JSON.stringify({
              answer: answer.trim(),
              source: 'gemini_api',
            })
          );
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error:
                err instanceof Error
                  ? err.message
                  : 'Gemini API call failed',
            })
          );
        }
      });
    });
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      localGeminiApiPlugin,
    ],

    define: {
      // No secrets should be injected into the browser bundle.
    },

    build: {
      outDir: 'dist',
      sourcemap: false,

      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react')) {
              return 'vendor-react';
            }

            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }

            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }

            return undefined;
          },
        },
      },
    },

    server: {
      port: 5173,
    },
  };
});
