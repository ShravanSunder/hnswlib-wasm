import "./hnswlib.js";
import * as wasm from "./hnswlib.wasm";
import { type Factory } from "./hnswlib";
import { HnswlibModule } from "./";

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

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

// Utility function to load the WASM binary depending on the environment
const loadWasmBinary = async (wasmPath: string) => {
  if (isNode) {
    const fs = await import("fs/promises");
    const path = await import("path");
    const fullPath = path.join(__dirname, "..", "lib", wasmPath);
    return await fs.readFile(fullPath);
  } else {
    const response = await fetch(wasmPath);
    return await response.arrayBuffer();
  }
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
      const modulePath = require.resolve("./hnswlib.js");
      factory = require(modulePath);
    } else {
      factory = (await import("./hnswlib.js")).default;
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


