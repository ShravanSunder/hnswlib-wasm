
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import commonjs from 'vite-plugin-commonjs'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import nodeResolve from "@rollup/plugin-node-resolve";
import tsconfigPaths from 'vite-tsconfig-paths'
import dts from 'vite-plugin-dts'




export default defineConfig({
  plugins: [
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
          src: './lib/hnswlib.d.ts',
          dest: './lib',
        }
      ]
    }), 
    tsconfigPaths(),
    dts({
      insertTypesEntry: true,
    })
  ],
  optimizeDeps: {
  },
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'hnswlib-wasm',
      // the proper extensions will be added
      fileName: 'hnswlib',
      formats: ['es']
    },
    commonjsOptions: {
      include: [],
      exclude: []
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [],
    },
  }, 
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    environment: 'happy-dom',
    // browser: {
    //   enabled: true,
    //   name: 'chromium',
    //   headless: true,
    //   provider: 'playwright'
    // }

  }
})
