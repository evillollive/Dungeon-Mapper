import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  publicDir: false,
  ssr: { noExternal: ['fflate'], external: ['sharp'] },
  build: {
    ssr: fileURLToPath(new URL('./inspect.ts', import.meta.url)),
    target: 'node24', minify: false,
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
});
