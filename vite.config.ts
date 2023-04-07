import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import commonjs from 'vite-plugin-commonjs';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import nodeResolve from '@rollup/plugin-node-resolve';
import tsconfigPaths from 'vite-tsconfig-paths';
import dts from 'vite-plugin-dts';
import checker from 'vite-plugin-checker';
import eslint from 'vite-plugin-eslint';
import vitest from 'eslint-plugin-vitest';

export default defineConfig({
  plugins: [
    checker({
      typescript: { tsconfigPath: './tsconfig.build.json' },
    }),
    eslint({
      include: ['./lib/**/*.ts'],
    }),
    wasm(),
    topLevelAwait(),
    viteStaticCopy({
      targets: [
        {
          src: './lib/hnswlib.wasm',
          dest: './',
        },
        {
          src: './lib/hnswlib.wasm.map',
          dest: './',
        },
        {
          src: './lib/hnswlib-wasm.d.ts',
          dest: './',
        },
      ],
    }),
    tsconfigPaths(),
    dts({
      insertTypesEntry: true,
      tsConfigFilePath: './tsconfig.build.json',
    }),
  ],
  optimizeDeps: {},
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'hnswlib-wasm',
      // the proper extensions will be added
      fileName: 'hnswlib',
      formats: ['es'],
    },
    commonjsOptions: {
      include: [],
      exclude: [],
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [],
    },
  },
  test: {
    globals: true,
    include: ['./test/tests/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    environment: 'happy-dom',
    benchmark: {
      include: ['**/*.bench.test.ts'],
    },
    // exclude: ['test/**/*.bench.ts'],
    // browser: {
    //   enabled: true,
    //   name: 'chromium',
    //   headless: true,
    //   provider: 'playwright'
    // }
  },
});
