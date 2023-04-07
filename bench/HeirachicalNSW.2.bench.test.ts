/* eslint-disable prefer-const */

import { bench } from 'vitest';
import { adaDimensions, createVectorData } from '~test/testHelpers';
import { defaultParams, HierarchicalNSW, HnswlibModule, hnswParamsForAda, loadHnswlib } from '../dist/hnswlib';

describe('benchmark searchKnn with thousand points and default params', async () => {
  let hnswlib: HnswlibModule;
  let index: HierarchicalNSW;
  const baseIndexSize = 1000;
  const testVectorData = createVectorData(baseIndexSize, hnswParamsForAda.dimensions);

  beforeAll(async () => {
    hnswlib = await loadHnswlib();
    index = new hnswlib.HierarchicalNSW('l2', adaDimensions);
    index.initIndex(baseIndexSize, hnswParamsForAda.m, hnswParamsForAda.efConstruction, undefined, true);
    index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
  });

  const setup = async (m: number, efConstruction: number) => {
    index.setEfSearch(hnswParamsForAda.efSearch);
    if (!hnswlib) {
      // hnswlib = await loadHnswlib();
      // index = new hnswlib.HierarchicalNSW('l2', adaDimensions);
      // index.initIndex(baseIndexSize, m, efConstruction, undefined, true);
      // index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
    }
  };

  bench(
    `default parameters: ${hnswParamsForAda.m}, efConstruction=${hnswParamsForAda.efConstruction} efSearch=${hnswParamsForAda.efSearch}`,
    async () => {
      index.setEfSearch(hnswParamsForAda.efSearch);
      index.searchKnn(testVectorData.vectors[10], 10, undefined);
    },
    {
      setup: () => setup(hnswParamsForAda.m, hnswParamsForAda.efConstruction),
      iterations: 1,
    }
  );
});
