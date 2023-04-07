import "./hnswlib.mjs";
import factory, { type Factory } from "./hnswlib-wasm";
import { HnswlibModule } from "./";


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

    // @ts-expect-error - hnswlib can be a global variable in the browser
    if (typeof hnswlib !== "undefined" && hnswlib !== null ) {
      // @ts-expect-error - hnswlib can be a global variable in the browser
      const lib = hnswlib();
      if (lib != null)
        return lib;
    }

    if (!library) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const temp = (await import("./hnswlib.mjs"));
      const factory = temp.default;

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


