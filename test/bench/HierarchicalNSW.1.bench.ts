
import { bench } from "vitest";
import { adaDimensions, createVectorData,  } from "~test/testHelpers";
import { defaultParams, HierarchicalNSW, HnswlibModule,  loadHnswlib,  } from "../../dist/hnswlib";



describe("benchmark initIndex", () => {
  let hnswlib: HnswlibModule
  let index: HierarchicalNSW;
  const setup = async () => { 
    // if (!hnswlib) {
    hnswlib = await loadHnswlib();
    index = new hnswlib.HierarchicalNSW("l2", adaDimensions);
    // }
  }
  const baseIndexSize = 1000;
  bench(`${baseIndexSize} points`, async () => {
    const newIndexSize = baseIndexSize;
    index.initIndex(newIndexSize, ...defaultParams.initIndex);
  }, {
    setup
  }
  );

  bench(`${baseIndexSize * 10} points`, async () => {
    const newIndexSize = baseIndexSize * 10;
    index.initIndex(newIndexSize, ...defaultParams.initIndex);
  }, {
    setup
  });

  bench(`${baseIndexSize * 100} points`, async () => {
    const newIndexSize = baseIndexSize * 100;
    index.initIndex(newIndexSize, ...defaultParams.initIndex);
  }, {
    setup
  });
});





describe("benchmark initIndex and addPoints", () => {
  let hnswlib: HnswlibModule
  let index: HierarchicalNSW;
  const setup = async () => { 
    // if (!hnswlib) {
    hnswlib = await loadHnswlib();
    index = new hnswlib.HierarchicalNSW("l2", adaDimensions);
    // }
  }
  const baseIndexSize = 10;
  bench(`${baseIndexSize} points`, async () => {
    const newIndexSize = baseIndexSize;
    index.initIndex(newIndexSize, ...defaultParams.initIndex);
    const testVectorData = createVectorData(newIndexSize, adaDimensions);
    
    index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
  }, {
    setup,
    iterations: 5
  });

  bench(`${baseIndexSize * 10} points`, async () => {
    const newIndexSize = baseIndexSize * 10;
    index.initIndex(newIndexSize, ...defaultParams.initIndex);
    const testVectorData = createVectorData(newIndexSize, adaDimensions);
    index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
  }, {
    setup,
    iterations: 5
  });

  bench(`${baseIndexSize * 100} points`, async () => {
    const newIndexSize = baseIndexSize * 100;
    index.initIndex(newIndexSize, ...defaultParams.initIndex);
    const testVectorData = createVectorData(newIndexSize, adaDimensions);
    index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
  }, {
    setup,
    iterations: 5
  });

});