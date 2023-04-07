

import  type * as module  from './hnswlib-wasm';
export type HierarchicalNSW = module.HierarchicalNSW;
export type BruteforceSearch = module.BruteforceSearch;
export type EmscriptenFileSystemManager = module.EmscriptenFileSystemManager
export type L2Space = module.L2Space;
export type InnerProductSpace = module.InnerProductSpace

export type HnswlibModule = module.HnswlibModule;

export type syncFs = HnswlibModule['syncFs'];
export type normalizePoint = HnswlibModule['normalizePoint'];



export * from './loadHnswlib';
export * from "./constants"

export const IdbfsFileStore = "FILE_DATA";