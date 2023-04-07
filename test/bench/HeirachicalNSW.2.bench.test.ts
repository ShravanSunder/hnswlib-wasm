/* eslint-disable prefer-const */

import { bench } from 'vitest';
import { adaDimensions, createVectorData } from '~test/testHelpers';
import { defaultParams, defaultParamtersTypes, HierarchicalNSW, HnswlibModule, loadHnswlib } from '../../dist/hnswlib';

describe.skip('benchmark searchKnn with 1000 points', async () => {
  let hnswlib: HnswlibModule;
  let index: HierarchicalNSW;
  const baseIndexSize = 100;
  const testVectorData = createVectorData(baseIndexSize, adaDimensions);

  const setup = async (m: number, efConstruction: number) => {
    if (!hnswlib) {
      hnswlib = await loadHnswlib();
      index = new hnswlib.HierarchicalNSW('l2', adaDimensions);
      index.initIndex(baseIndexSize, m, efConstruction, undefined, true);
      index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
    }
  };

  bench(
    `m=16, efConstruction=16`,
    async () => {
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(8, 16),
    }
  );

  bench(
    `m=32, efConstruction=16`,
    async () => {
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(32, 16),
    }
  );

  bench(
    `m=64, efConstruction=16`,
    async () => {
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(64, 16),
    }
  );

  bench(
    `m=16, efConstruction=32`,
    async () => {
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(16, 32),
    }
  );

  bench(
    `m=32, efConstruction=32`,
    async () => {
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(32, 32),
    }
  );

  bench(
    `m=64, efConstruction=32`,
    async () => {
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(64, 16),
    }
  );
});

describe('benchmark searchKnn with 1000 and small points', async () => {
  let hnswlib: HnswlibModule;
  let index: HierarchicalNSW;
  const baseIndexSize = 100;
  const testVectorData = createVectorData(baseIndexSize, adaDimensions);

  const setup = async (m: number, efConstruction: number, efSearch: number) => {
    if (!hnswlib) {
      hnswlib = await loadHnswlib();
      index = new hnswlib.HierarchicalNSW('l2', adaDimensions);
      index.initIndex(baseIndexSize, m, efConstruction, undefined, true);
      index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
      index.setEf(efSearch);
    }
  };

  bench(
    `m=64, efConstruction=16, efSearch=16`,
    async () => {
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(64, 16, 16),
      iterations: 5,
    }
  );
});
