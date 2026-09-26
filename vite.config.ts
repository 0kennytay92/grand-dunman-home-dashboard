import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths, so the app works both locally and at
  // https://<user>.github.io/grand-dunman-home-dashboard/
  base: './',
});
