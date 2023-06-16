import { bench } from 'vitest';
import { createVectorData } from '~test/testHelpers';
import { defaultParams, HierarchicalNSW, hnswParamsForAda } from '../dist/hnswlib';

const baseIndexSize = 1000;
describe(`benchmark initIndex and addPoints/additems ${baseIndexSize} items`, () => {
  let index: HierarchicalNSW;
  const newIndexSize = baseIndexSize;
  const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);

  const setup = async () => {
    index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions, 'autotest.dat');
  };

  bench(
    `addItems without replace`,
    async () => {
      index.initIndex(newIndexSize, ...defaultParams.initIndex);
      const labels = index.addItems(testVectorData.vectors, false);
      expect(index.getCurrentCount()).toBe(newIndexSize);
      expect(labels.length).toBe(newIndexSize);
    },
    {
      setup,
      iterations: 3,
    }
  );
  bench(
    `addItems with replace`,
    async () => {
      index.initIndex(newIndexSize, ...defaultParams.initIndexReplace);
      const labels = index.addItems(testVectorData.vectors, true);
      expect(index.getCurrentCount()).toBe(newIndexSize);
      expect(labels.length).toBe(newIndexSize);
    },
    {
      setup,
      iterations: 3,
    }
  );
});
