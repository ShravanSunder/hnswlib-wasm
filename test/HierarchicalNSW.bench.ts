
import { bench } from "vitest";
import { defaultParams, HierarchicalNSW, HnswlibModule,  loadHnswlib,  } from "../dist/hnswlib";

let hnswlib: HnswlibModule;
let index: HierarchicalNSW;

// const baseIndexSize = 1000;
// bench(`benchmark initindex ${baseIndexSize * 10} points`, () => {
//   const newIndexSize = baseIndexSize * 10;
//   index.initIndex(newIndexSize, ...defaultParams.initIndex);
// }, {
//   setup: async () => {
//     hnswlib = await loadHnswlib(),
//     index = new hnswlib.HierarchicalNSW("l2", 3)
//   }
// });
