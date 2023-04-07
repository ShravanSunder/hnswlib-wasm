import { bench } from 'vitest';
import { createVectorData } from '~test/testHelpers';
import { defaultParams, HierarchicalNSW, HnswlibModule, hnswParamsForAda, loadHnswlib } from '../dist/hnswlib';

describe('benchmark initIndex with defaults and 1536 dimensions', () => {
  let index: HierarchicalNSW;
  const setup = async () => {
    index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions);
    // }
  };
  const baseIndexSize = 1000;
  bench(
    `${baseIndexSize} points`,
    async () => {
      const newIndexSize = baseIndexSize;
      index.initIndex(newIndexSize, ...defaultParams.initIndex);
    },
    {
      setup,
    }
  );

  bench(
    `${baseIndexSize * 10} points`,
    async () => {
      const newIndexSize = baseIndexSize * 10;
      index.initIndex(newIndexSize, ...defaultParams.initIndex);
    },
    {
      setup,
    }
  );

  bench(
    `${baseIndexSize * 100} points`,
    async () => {
      const newIndexSize = baseIndexSize * 100;
      index.initIndex(newIndexSize, ...defaultParams.initIndex);
    },
    {
      setup,
    }
  );
});

describe('benchmark initIndex with hnswParamsForAda', () => {
  let index: HierarchicalNSW;
  const setup = async () => {
    index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions);
    // }
  };
  const baseIndexSize = 1000;
  bench(
    `${baseIndexSize} points`,
    async () => {
      index.initIndex(baseIndexSize, hnswParamsForAda.m, hnswParamsForAda.efConstruction, 200, true);
    },
    {
      setup,
    }
  );

  bench(
    `${baseIndexSize * 10} points`,
    async () => {
      const newIndexSize = baseIndexSize * 10;
      index.initIndex(newIndexSize, hnswParamsForAda.m, hnswParamsForAda.efConstruction, 200, true);
    },
    {
      setup,
    }
  );

  bench.skip(
    `${baseIndexSize * 100} points`,
    async () => {
      const newIndexSize = baseIndexSize * 100;
      index.initIndex(newIndexSize, hnswParamsForAda.m, hnswParamsForAda.efConstruction, 200, true);
    },
    {
      setup,
    }
  );
});

describe('benchmark initIndex and addPoints', () => {
  let hnswlib: HnswlibModule;
  let index: HierarchicalNSW;
  const setup = async () => {
    // if (!hnswlib) {
    hnswlib = await loadHnswlib();
    index = new hnswlib.HierarchicalNSW('l2', hnswParamsForAda.dimensions);
    // }
  };
  const baseIndexSize = 10;
  bench(
    `${baseIndexSize} points`,
    async () => {
      const newIndexSize = baseIndexSize;
      index.initIndex(newIndexSize, ...defaultParams.initIndex);
      const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);

      index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
    },
    {
      setup,
      iterations: 5,
    }
  );

  bench(
    `${baseIndexSize * 10} points`,
    async () => {
      const newIndexSize = baseIndexSize * 10;
      index.initIndex(newIndexSize, ...defaultParams.initIndex);
      const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);
      index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
    },
    {
      setup,
      iterations: 5,
    }
  );

  bench(
    `${baseIndexSize * 100} points`,
    async () => {
      const newIndexSize = baseIndexSize * 100;
      index.initIndex(newIndexSize, ...defaultParams.initIndex);
      const testVectorData = createVectorData(newIndexSize, hnswParamsForAda.dimensions);
      index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
    },
    {
      setup,
      iterations: 5,
    }
  );
});
