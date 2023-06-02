import './hnswlib.mjs';
import { type HnswModuleFactory, HnswlibModule } from '.';
import { read } from 'fs';

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
loadHnswlib();
