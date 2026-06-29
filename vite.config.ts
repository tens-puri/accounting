import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // ดึง Gemini API Key จากหลายชื่อ รองรับทั้งชื่อบน Vercel (NEXT_PUBLIC_API_KEY)
    // และ .env.local ในเครื่อง (GEMINI_API_KEY / API_KEY)
    // เช็คทั้งจาก loadEnv (.env files) และ process.env (env vars บน Vercel)
    const geminiKey =
      env.NEXT_PUBLIC_API_KEY ||
      env.GEMINI_API_KEY ||
      env.API_KEY ||
      process.env.NEXT_PUBLIC_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.API_KEY ||
      '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.NEXT_PUBLIC_API_KEY': JSON.stringify(geminiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});