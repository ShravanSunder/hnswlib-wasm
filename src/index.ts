import type * as module from './hnswlib-wasm';
import type factory from './hnswlib-wasm';
// import './hnswlib.mjs';

export type HierarchicalNSW = module.HierarchicalNSW;
export type BruteforceSearch = module.BruteforceSearch;
export type EmscriptenFileSystemManager = module.EmscriptenFileSystemManager;
export type L2Space = module.L2Space;
export type InnerProductSpace = module.InnerProductSpace;

export type HnswModuleFactory = typeof factory;
export type normalizePoint = HnswlibModule['normalizePoint'];
export const IDBFS_STORE_NAME = 'FILE_DATA';

export * from './constants';

export interface HnswlibModule extends Omit<EmscriptenModule, '_malloc' | '_free'> {
  normalizePoint(vec: number[]): number[];
  L2Space: typeof module.L2Space;
  InnerProductSpace: typeof module.InnerProductSpace;
  BruteforceSearch: typeof module.BruteforceSearch;
  HierarchicalNSW: typeof module.HierarchicalNSW;
  EmscriptenFileSystemManager: typeof module.EmscriptenFileSystemManager;
  asm: {
    malloc(size: number): number;
    free(ptr: number): void;
  };
}

let library: Awaited<HnswlibModule>;
type InputFsType = 'IDBFS' | undefined;

export const syncFileSystem = (action: 'read' | 'write'): Promise<void> => {
  const EmscriptenFileSystemManager: HnswlibModule['EmscriptenFileSystemManager'] = library.EmscriptenFileSystemManager;

  const syncAction = action === 'read' ? true : action === 'write' ? false : undefined;
  if (syncAction === undefined) throw new Error('Invalid action type');

  return new Promise((resolve, reject) => {
    try {
      EmscriptenFileSystemManager.syncFS(syncAction, () => {
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const waitForFileSystemInitalized = (): Promise<void> => {
  const EmscriptenFileSystemManager: HnswlibModule['EmscriptenFileSystemManager'] = library.EmscriptenFileSystemManager;
  return new Promise((resolve, reject) => {
    let totalWaitTime = 0;
    const checkInterval = 100; // Check every 100ms
    const maxWaitTime = 4000; // Maximum wait time of 4 seconds

    const checkInitialization = () => {
      if (EmscriptenFileSystemManager.isInitialized()) {
        resolve();
      } else if (totalWaitTime >= maxWaitTime) {
        reject(new Error('Failed to initialize filesystem'));
      } else {
        totalWaitTime += checkInterval;
        setTimeout(checkInitialization, checkInterval);
      }
    };

    setTimeout(checkInitialization, checkInterval);
  });
};

export const waitForFileSystemSynced = (): Promise<void> => {
  const EmscriptenFileSystemManager = library.EmscriptenFileSystemManager;
  return new Promise((resolve, reject) => {
    let totalWaitTime = 0;
    const checkInterval = 100; // Check every 100ms
    const maxWaitTime = 4000; // Maximum wait time of 4 seconds

    const checkInitialization = () => {
      if (EmscriptenFileSystemManager.isSynced()) {
        resolve();
      } else if (totalWaitTime >= maxWaitTime) {
        reject(new Error('Failed to initialize filesystem'));
      } else {
        totalWaitTime += checkInterval;
        setTimeout(checkInitialization, checkInterval);
      }
    };

    setTimeout(checkInitialization, checkInterval);
  });
};

/**
 * Initializes the file system for the HNSW library using the specified file system type.
 * If no file system type is specified, IDBFS is used by default.
 * @param inputFsType The type of file system to use. Can be 'IDBFS' or undefined.
 * @returns A promise that resolves when the file system is initialized, or rejects if initialization fails.
 */
const initializeFileSystemAsync = async (inputFsType?: InputFsType): Promise<void> => {
  const fsType = inputFsType == null ? 'IDBFS' : inputFsType;
  const EmscriptenFileSystemManager = library.EmscriptenFileSystemManager;

  if (EmscriptenFileSystemManager.isInitialized()) {
    return;
  }
  EmscriptenFileSystemManager.initializeFileSystem(fsType);
  return await waitForFileSystemInitalized();
};

/**
 * Load the HNSW library in node or browser
 */
export const loadHnswlib = async (inputFsType?: InputFsType): Promise<HnswlibModule> => {
  try {
    // @ts-expect-error - hnswlib can be a global variable in the browser
    if (typeof hnswlib !== 'undefined' && hnswlib !== null) {
      // @ts-expect-error - hnswlib can be a global variable in the browser
      const lib = hnswlib();
      if (lib != null) return lib;
    }

    if (!library) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const temp = await import('./hnswlib.mjs');
      const factoryFunc = temp.default;

      library = await factoryFunc();
      await initializeFileSystemAsync(inputFsType);
      return library; // Add this line
    }
    return library;
  } catch (err) {
    console.error('----------------------------------------');
    console.error('Error initializing the library:', err);
    throw err;
  }
};

// disabled due to lack of perfomance improvemant and additional complexity

// /**
//  * Adds items and their corresponding labels to the HierarchicalNSW index using memory pointers.
//  * This function handles the memory allocation for the Emscripten Module, and properly frees the memory after use.  its a wrapper around {@link HierarchicalNSW#addItemsWithPtrs}
//  *
//  * ⛔️ This function is only 1.02x faster than vectors for 10k points version which are easier to use.  The sole advantage is memory savings
//  *
//  * @async
//  * @param {HnswlibModule} Module - The Emscripten HNSWLIB Module object.
//  * @param {HierarchicalNSW} index - The HierarchicalNSW index object.
//  * @param {Float32Array[] | number[][]} items - An array of item vectors to be added to the search index. Each item should be a Float32Array or an array of numbers.
//  * @param {number[]} labels - An array of numeric labels corresponding to the items. The length of the labels array should match the length of the items array.
//  * @param {boolean} replaceDeleted - A flag to determine if deleted elements should be replaced (default: false).
//  * @returns {Promise<void>} A promise that resolves once the items and labels have been added to the index.
//  */
// export const addItemsWithPtrsHelper = async (
//   Module: HnswlibModule,
//   index: HierarchicalNSW,
//   items: Float32Array[] | number[][],
//   labels: number[],
//   replaceDeleted: boolean
// ): Promise<void> => {
//   const itemCount = items.length;
//   const dim = items[0].length;

//   // Flatten the items array into a Float32Array
//   const flatItems = new Float32Array(itemCount * dim);
//   items.forEach((vec, i) => {
//     flatItems.set(vec, i * dim);
//   });

//   // Convert labels to a Uint32Array
//   const labelsArray = new Uint32Array(labels);

//   const vecDataPtr = Module.asm.malloc(flatItems.length * Float32Array.BYTES_PER_ELEMENT);
//   const labelVecDataPtr = Module.asm.malloc(labelsArray.length * Uint32Array.BYTES_PER_ELEMENT);

//   if (vecDataPtr === 0) {
//     throw new Error('Failed to allocate memory for vecDataPtr.');
//   }

//   if (labelVecDataPtr === 0) {
//     throw new Error('Failed to allocate memory for labelVecDataPtr.');
//   }

//   Module.HEAPF32.set(flatItems, vecDataPtr / Float32Array.BYTES_PER_ELEMENT);
//   Module.HEAPU32.set(labelsArray, labelVecDataPtr / Uint32Array.BYTES_PER_ELEMENT);

//   await index.addItemsWithPtr(
//     Module.HEAPF32.subarray(
//       Math.floor(vecDataPtr / Float32Array.BYTES_PER_ELEMENT),
//       Math.floor(vecDataPtr / Float32Array.BYTES_PER_ELEMENT) + itemCount * dim
//     ),
//     itemCount * dim,
//     Module.HEAPU32.subarray(
//       Math.floor(labelVecDataPtr / Uint32Array.BYTES_PER_ELEMENT),
//       Math.floor(labelVecDataPtr / Uint32Array.BYTES_PER_ELEMENT) + itemCount
//     ),
//     itemCount,
//     replaceDeleted
//   );

//   Module.asm.free(vecDataPtr);
//   Module.asm.free(labelVecDataPtr);
// };
