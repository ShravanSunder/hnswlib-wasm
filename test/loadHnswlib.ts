import path from 'path';
import hnswlib from '../lib/hnswlib';
import fs from 'fs/promises';
import { HnswlibModule } from '../src/hnswlib';

/**
 * Load the HNSW library in node
 */
export const loadHnswlib = async (): Promise<HnswlibModule> => {
  try {
    const wasmPath = path.join(__dirname, '..', 'lib', 'hnswlib.wasm');
    const wasmBinary = await fs.readFile(wasmPath);
    const wasmModule = await WebAssembly.compile(wasmBinary);
    const library = await hnswlib({
      wasmBinary,
      onRuntimeInitialized: () => {
        console.log('Runtime initialized');
      },
    });

    return library;

    //space = new library.L2Space(3);
  } catch (err) {
    console.error('----------------------------------------');
    console.error('Error initializing the library:', err);
    throw err;
  }
};