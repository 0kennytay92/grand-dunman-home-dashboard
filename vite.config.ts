import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Each published version gets an id. The app compares it with version.json on the website,
// so a phone that is still running an older copy knows to refresh.
const buildId = new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) });
      },
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  // Relative paths, so the app works both locally and at
  // https://<user>.github.io/grand-dunman-home-dashboard/
  base: './',
});
