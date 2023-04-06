import "./hnswlib.mjs";
import { type Factory } from "./hnswlib";
import { HnswlibModule } from "./";

const isNode =
  typeof process !== "undefined" &&
  process?.versions != null &&
  process?.versions?.node != null;

let library: Awaited<ReturnType<Factory>>;
type InputFsType = "NODEFS" | "IDBFS" | undefined;

const initializeFileSystemAsync = async (
  inputFsType?: InputFsType
): Promise<void> => {
  const fsType =
    inputFsType == null ? "IDBFS" : inputFsType;
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
/**
 * Load the HNSW library in node or browser
 */
export const loadHnswlib = async (
  inputFsType?: InputFsType
): Promise<HnswlibModule> => {
  try {
    let factory: Factory;

    // @ts-ignore
    if (typeof hnswlib !== "undefined" && hnswlib !== null ) {
      // @ts-ignore
      const lib = hnswlib();
      if (lib != null)
        return lib;
    }

    // @ts-ignore
    const temp = (await import("./hnswlib.mjs"));
    factory = temp.default;
    

    if (!library) {
      library = await factory();
      console.log("Library initialized");
      await initializeFileSystemAsync(inputFsType);
      return library; // Add this line
    }
    return library;
  } catch (err) {
    console.error("----------------------------------------");
    console.error("Error initializing the library:", err);
    throw err;
  }
};
loadHnswlib();


