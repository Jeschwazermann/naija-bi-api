import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ✅ Best Practice: port fixed (not the Vite default 5173) purely so the
// README's CORS_ORIGIN example has one obvious value to point at.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  preview: { port: 5174 },
});
