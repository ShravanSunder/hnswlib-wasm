/* eslint-disable prefer-const */

import { bench } from 'vitest';
import { createVectorData, sleep } from '~test/testHelpers';
import {
  defaultParams,
  HierarchicalNSW,
  HnswlibModule,
  hnswParamsForAda,
  loadHnswlib,
  addItemsWithPtrsHelper,
} from '../dist/hnswlib';

let index: HierarchicalNSW;

async function setupBefore() {
  const baseIndexSize = 10000;
  const testVectorData = createVectorData(baseIndexSize, hnswParamsForAda.dimensions);
  index = new testHnswlibModule.HierarchicalNSW('l2', hnswParamsForAda.dimensions);
  index.initIndex(baseIndexSize, hnswParamsForAda.m, hnswParamsForAda.efConstruction, 200, true);
  console.log(testHnswlibModule);

  await sleep(20);

  // Add vectors in chunks of 1000
  const chunkSize = 2500;
  for (let i = 0; i < baseIndexSize; i += chunkSize) {
    console.log('chunk', i);
    const chunkVectors = testVectorData.vectors.slice(i, i + chunkSize);
    const chunkLabels = testVectorData.labels.slice(i, i + chunkSize);
    //index.addItems(chunkVectors, chunkLabels, ...defaultParams.addPoint);
    addItemsWithPtrsHelper(testHnswlibModule, index, chunkVectors, chunkLabels, ...defaultParams.addPoint);
    await sleep(20);
  }

  return { baseIndexSize, testVectorData };
}

const { baseIndexSize, testVectorData } = await setupBefore();

describe('benchmark searchKnn with thousand points and default params', async () => {
  beforeAll(async () => {
    expect(index.getCurrentCount()).toBe(baseIndexSize);
  });

  const setup = async (m: number, efConstruction: number) => {
    index.setEfSearch(hnswParamsForAda.efSearch);
  };

  bench(
    `default parameters: ${hnswParamsForAda.m}, efConstruction=${hnswParamsForAda.efConstruction} efSearch=${hnswParamsForAda.efSearch}`,
    async () => {
      index.setEfSearch(hnswParamsForAda.efSearch);
      const data = index.searchKnn(testVectorData.vectors[10], 10, undefined);
      expect(data.neighbors).toHaveLength(10);
    },
    {
      setup: () => setup(hnswParamsForAda.m, hnswParamsForAda.efConstruction),
      iterations: 100,
    }
  );
});
