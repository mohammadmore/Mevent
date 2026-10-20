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
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth'],
            motion: ['motion/react'],
            leaflet: ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
            datepicker: ['react-multi-date-picker'],
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
