import { bench } from 'vitest';
import { createVectorData } from '~test/testHelpers';
import { defaultParams, HierarchicalNSW, HnswlibModule, hnswParamsForAda, loadHnswlib } from '../dist/hnswlib';

describe('benchmark initIndex with defaults and 1536 dimensions', () => {
  let index: HierarchicalNSW;
  const setup = async () => {
    index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions, 'autotest.dat');
    // }
  };
  const baseIndexSize = 1000;
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
    `${baseIndexSize * 50} points`,
    async () => {
      const newIndexSize = baseIndexSize * 50;
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
    index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions, 'autotest.dat');
    // }
  };
  const baseIndexSize = 1000;

  bench(
    `${baseIndexSize * 10} points`,
    async () => {
      const newIndexSize = baseIndexSize * 10;
      index.initIndex(newIndexSize, hnswParamsForAda.m, hnswParamsForAda.efConstruction, 200);
    },
    {
      setup,
    }
  );

  bench(
    `${baseIndexSize * 50} points`,
    async () => {
      const newIndexSize = baseIndexSize * 50;
      index.initIndex(newIndexSize, hnswParamsForAda.m, hnswParamsForAda.efConstruction, 200);
    },
    {
      setup,
    }
  );
});
