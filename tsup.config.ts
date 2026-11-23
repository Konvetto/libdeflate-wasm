import { copyFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  platform: 'neutral',
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  onSuccess: () => {
    // The module loads `new URL('./libdeflate.wasm', import.meta.url)`, so the file sits next to it.
    copyFileSync('src/libdeflate.wasm', 'dist/libdeflate.wasm');
    return Promise.resolve();
  },
});
