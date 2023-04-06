

export const testErrors = {

  indexSize : /The maximum number of elements has been reached in index/,
  vectorSize : /Invalid vector size. Must be equal to the dimension of the space./,
  vectorArgument : /Cannot convert .* to float/,
  
  unsignedIntArgument : /Cannot convert .* to unsigned int/,
  
  arugmentCount : /called with .* arguments, expected .* args!/,
  
  stringArgument: /Cannot pass non-string to std::string/,
  
  indexNotInitalized: /Search index has not been initialized, call `initIndex` in advance/,

  isNotFunction: /is not a function/,
}

export type testErrorTypes = keyof typeof testErrors;


export const adaDimensions = 1536 as const;
export const createVectorData = (numOfVec: number = 100, dimensions: number = adaDimensions) => {
  const vectors: Float32Array[] = [];
  const labels: number[] = [];
  
  for (let i = 0; i < numOfVec; i++) {
    const vector = Array.from({length: dimensions}, () => Math.random());
    vectors.push(new Float32Array(vector));
    labels.push(i);
  }
  
  return {vectors, labels};
}
