import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// Preloads the self-hosted Vazirmatn font so text does not first render in a fallback font.
function preloadFont(): Plugin {
  return {
    name: 'mevent-preload-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const font = Object.keys(ctx.bundle || {}).find(f => /Vazirmatn-Variable-.*\.woff2$/.test(f));
        return font ? [{ tag: 'link', attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' }] : [];
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), preloadFont()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Large libraries get their own long-cached chunks; maps and charts load only when used.
          // React gets its own chunk: grouped by package list, it ended up inside the motion and
          // map chunks, which made every first visit download the map library.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
            if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'firebase';
            if (/node_modules\/(leaflet|react-leaflet|@react-leaflet|react-leaflet-cluster|leaflet\.markercluster)\//.test(id)) return 'leaflet';
            if (/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
            if (/node_modules\/(react-multi-date-picker|react-date-object)\//.test(id)) return 'datepicker';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
