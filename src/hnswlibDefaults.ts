/**
 * Default parameters for the HNSW index.
 *  @param {number} m The maximum number of outgoing connections on the graph (default: 16).
 * @param {number} efConstruction The parameter that controls speed/accuracy trade-off during the index construction (default: 200).
 * @param {number} randomSeed The seed value of random number generator (default: 100).
 * @param {boolean} allowReplaceDeleted The flag to replace deleted element when adding new element
 *
 */
export const initIndexDefaultParameters = [16, 200, 100, false] as const;
