import "./hnswlib.js";
import { type Factory } from "./hnswlib";
import * as esmModule from "./hnswlib.js";
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
    inputFsType == null ? (isNode ? "NODEFS" : "IDBFS") : inputFsType;
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
    if (isNode) {
      if (typeof document !== "undefined") {
        // this is electron
        const temp = (await import("./hnswlib.js")) as any;
        const temp2 = await temp?.();
        const temp3 = temp2 ? esmModule : esmModule.default;
        console.log(temp, temp2, temp3, esmModule);
        factory = temp2
      }
      else {
        const modulePath = require.resolve("./hnswlib.js");
        factory = require(modulePath);
      }
    } else {
      const temp = (await import("./hnswlib.js"));
      factory = temp.default;
    }

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


