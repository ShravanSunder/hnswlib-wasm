export const defaultParams = {
  /**
   * Default parameters for the HNSW index.
   * @param {number} m The maximum number of outgoing connections on the graph (default: 16).
   * @param {number} efConstruction The parameter that controls speed/accuracy trade-off during the index construction (default: 200).
   * @param {number} randomSeed The seed value of random number generator (default: 100).
   * @param {boolean} allowReplaceDeleted The flag to replace deleted element when adding new element
   *
   */
  initIndex: [32, 128, 100, false],
  initIndexReplace: [32, 128, 100, true],
  /**
   * @param {boolean} replaceDeleted — The flag to replace a deleted element (default: false)
   */
} as const;

export type defaultParamtersTypes = keyof typeof defaultParams;

export const hnswParamsForAda = {
  m: 32,
  efSearch: 128,
  efConstruction: 128,
  numNeighbors: 8,
  dimensions: 1538,
} as const;
