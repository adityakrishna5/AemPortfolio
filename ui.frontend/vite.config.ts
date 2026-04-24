import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteForAem } from '@aem-vite/vite-aem-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => ({
  base: command === 'build' ? '/etc.clientlibs/adkstvite/clientlibs/' : '/',
  publicDir: command === 'build' ? false : 'src/main/webpack/static',

  build: {
    reportCompressedSize: false,
    manifest: false,
    minify: mode === 'development' ? false : 'esbuild',
    outDir: 'dist',
    sourcemap: command === 'serve' ? 'inline' : false,
    assetsDir: 'clientlib-site/resources/static',

    rollupOptions: {
      input: {
        bundle: 'src/main/webpack/site/main.ts',
        styles: 'src/main/webpack/site/main.scss',
        tailwind: 'src/main/webpack/site/tailwind.css',
      },
      output: {
        assetFileNames: (chunk) =>
          chunk.name?.endsWith('.css')
            ? 'clientlib-site/resources/css/[name][extname]'
            : 'clientlib-site/resources/static/[name].[hash][extname]',
        chunkFileNames: 'clientlib-site/resources/chunks/[name].[hash].js',
        entryFileNames: 'clientlib-site/resources/js/[name].js',
      },
    },
  },

  plugins: [
    tailwindcss(),
    react(),
    tsconfigPaths(),
    viteForAem({
      contentPaths: ['adkstvite'],
      publicPath: '/etc.clientlibs/adkstvite/clientlibs/clientlib-site',
      rewriterOptions: {
        resourcesPath: 'resources/js',
      },
    }),
  ],

  server: {
    port: 3000,
    origin: 'http://localhost:3000',
  },

}));
