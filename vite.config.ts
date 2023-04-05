
import { resolve } from 'path'
import { defineConfig } from 'vite'
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import commonjs from 'vite-plugin-commonjs'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import nodeResolve from "@rollup/plugin-node-resolve";


export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    commonjs(),
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
          dest: './',
        }
      ]
    }), 
    nodeResolve({ browser: true }),
  ],
  optimizeDeps: {
    include: [],
    exclude: [ ]
  },
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'hnswlib-wasm',
      // the proper extensions will be added
      fileName: 'hnswlib-wasm',
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
})
