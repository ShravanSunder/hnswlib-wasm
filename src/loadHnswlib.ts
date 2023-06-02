import './hnswlib.mjs';
import { type HnswModuleFactory, HnswlibModule } from '.';

let library: Awaited<ReturnType<HnswModuleFactory>>;
type InputFsType = 'IDBFS' | undefined;

export const waitForFileSystemReady = (): Promise<void> => {
  const EmscriptenFileSystemManager = library.EmscriptenFileSystemManager;
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
  return await waitForFileSystemReady();
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
      const factory = temp.default;

      library = await factory();
      // console.log('Library initialized');
      await initializeFileSystemAsync(inputFsType);
      console.log('IDBFS Filesystem initialized');
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
