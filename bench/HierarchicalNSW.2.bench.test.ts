import { bench } from 'vitest';
import { createVectorData } from '~test/testHelpers';
import {
  addItemsWithPtrsHelper,
  defaultParams,
  HierarchicalNSW,
  HnswlibModule,
  hnswParamsForAda,
  loadHnswlib,
} from '../dist/hnswlib';

describe('benchmark initIndex and addPoints', () => {
  const baseIndexSize = 10;

  describe.skip(`${baseIndexSize * 10} points`, () => {
    let index: HierarchicalNSW;
    const newIndexSize = baseIndexSize * 10;
    const setup = async () => {
      index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions);
    };

    bench(
      `vectors`,
      async () => {
        index.initIndex(newIndexSize, ...defaultParams.initIndex);
        const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);

        index.addItems(testVectorData.vectors, testVectorData.labels, false);
        expect(index.getCurrentCount()).toBe(newIndexSize);
      },
      {
        setup,
        iterations: 5,
      }
    );

    bench(
      `pointers`,
      async () => {
        index.initIndex(newIndexSize, ...defaultParams.initIndex);
        const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);
        addItemsWithPtrsHelper(
          testHnswlibModule,
          index,
          testVectorData.vectors,
          testVectorData.labels,
          false
        );
        expect(index.getCurrentCount()).toBe(newIndexSize);
      },
      {
        setup,
        iterations: 5,
      }
    );
  });
  describe(`${baseIndexSize * 100} points`, () => {
    let index: HierarchicalNSW;
    const newIndexSize = baseIndexSize * 100;
    const setup = async () => {
      index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions);
    };

    bench(
      `vectors`,
      async () => {
        index.initIndex(newIndexSize, ...defaultParams.initIndex);
        const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);

        index.addItems(testVectorData.vectors, testVectorData.labels, false);
        expect(index.getCurrentCount()).toBe(newIndexSize);
      },
      {
        setup,
        iterations: 5,
      }
    );

    bench(
      `pointers`,
      async () => {
        index.initIndex(newIndexSize, ...defaultParams.initIndex);
        const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);
        addItemsWithPtrsHelper(
          testHnswlibModule,
          index,
          testVectorData.vectors,
          testVectorData.labels,
          false
        );
        expect(index.getCurrentCount()).toBe(newIndexSize);
      },
      {
        setup,
        iterations: 5,
      }
    );
  });
});
