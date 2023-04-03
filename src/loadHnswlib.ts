import factory from './hnswlib';
import { HnswlibModule } from './';


const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

let library: Awaited<ReturnType<typeof factory>>;

const initializeFileSystemAsync = async (): Promise<void> => {
  const fsType = isNode ? 'NODEFS' : 'IDBFS';
  const EmscriptenFileSystemManager = library.EmscriptenFileSystemManager;
  return new Promise(function (resolve, reject) {
    
    if (EmscriptenFileSystemManager.isInitialized()) {
      resolve();
      return;
    }
    EmscriptenFileSystemManager.initializeFileSystem(fsType);
    // Use setTimeout to allow Emscripten to perform the filesystem operations.
    setTimeout(function () {
      if (EmscriptenFileSystemManager.isInitialized()) {
        resolve();
      } else {
        reject(new Error("Failed to initialize filesystem"));
      }
    }, 0);
  });
};


// Utility function to load the WASM binary depending on the environment
const loadWasmBinary = async (wasmPath: string ) => {
  if (isNode) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullPath = path.join(__dirname, '..', 'lib', wasmPath);
    return await fs.readFile(fullPath);
  } else {
    const response = await fetch(wasmPath);
    return await response.arrayBuffer();
  }
};

/**
 * Load the HNSW library in node or browser
 */
export const loadHnswlib = async (): Promise<HnswlibModule> => {
  try {
    // const wasmPath = './hnswlib.wasm'; // Make sure this path is correct for both Node and browser environments
    // const wasmBinary = await loadWasmBinary(wasmPath);

    // const library = await hnswlib({
    //   wasmBinary,
    //   onRuntimeInitialized: () => {
    //     console.log('Runtime initialized');
    //   },
    // });
    if (!library) {
      library = await factory();
      await initializeFileSystemAsync();
      console.log('Library initialized');
      return library; // Add this line
    }
    return library;
  } catch (err) {
    console.error('----------------------------------------');
    console.error('Error initializing the library:', err);
    throw err;
  }
};
loadHnswlib();


// (async () => {
//   try {
//     await loadHnswlib();
//     console.log("Filesystem initialized");
//   } catch (error) {
//     console.error("Failed to initialize filesystem:", error);
//   }
// })();