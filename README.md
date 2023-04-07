# hnswlib-wasm

This is a wasm version of [hnswlib](https://github.com/nmslib/hnswlib). Created by @ShravanSunder

Created with the help of library [hnswlib-node](https://github.com/yoshoku/hnswlib-node/).  See his wonderful docs here, [documentation](https://yoshoku.github.io/hnswlib-node/doc/) Thanks @yoshoku! 

> Note:  This is still a beta!


`hnswlib-wasm` provides Node.js bindings for [Hnswlib](https://github.com/nmslib/hnswlib)
that implements approximate nearest-neghbor search based on
hierarchical navigable small world graphs.  It will work in node.js and browser and is compiled with emscripten.

## Installation

```sh
$ yarn add hnswlib-wasm
```

## Documentation

* [hnswlib-node API Documentation](https://yoshoku.github.io/hnswlib-node/doc/) by @yoshoku for hnswlib-node is a accurate description of the API.  I will have modified the typescript definitions the API to work with wasm.  I will update this documentation as I go.  I will also add more examples.
* The big differences are loading and saving the index.  It supports `indexedDB` (in browser) and `fs` (in node) and uses FS from emscripten to save and laod the index via the virtual file system.
* See the changelog from `hnswlib-node` for more details by @yoshoku [changelog](./CHANGELOG.md)

## Usage

Generating search index:

```typescript
import { HierarchicalNSW } from 'hnswlib-node';

const numDimensions = 8; // the length of data point vector that will be indexed.
const maxElements = 10; // the maximum number of data points.

// declaring and intializing index.
const index = new HierarchicalNSW('l2', numDimensions);
index.initIndex(maxElements);

// inserting data points to index.
for (let i = 0; i < maxElements; i++) {
  const point = new Array(numDimensions);
  for (let j = 0; j < numDimensions; j++) point[j] = Math.random();
  index.addPoint(point, i);
}

// saving index.
index.writeIndexSync('foo.dat');
```

Searching nearest neighbors:

```typescript
import { HierarchicalNSW } from 'hnswlib-node';

// loading index.
const index = new HierarchicalNSW('l2', 3);
index.readIndexSync('foo.dat');

// preparing query data points.
const numDimensions = 8;
const query = new Array(numDimensions);
for (let j = 0; j < numDimensions; j++) query[j] = Math.random();

// searching k-nearest neighbor data points.
const numNeighbors = 3;
const result = index.searchKnn(query, numNeighbors);

console.table(result);
```

# HNSW Algorithm Parameters for hnswlib-wasm
This section will provide an overview of the HNSW algorithm parameters and their impact on performance when using the hnswlib-wasm library. 
HNSW (Hierarchical Navigable Small World) is a graph-based index structure for efficient similarity search in high-dimensional spaces. 

![](https://d33wubrfki0l68.cloudfront.net/1fcaebe70c031d408ae082da355bfe0c6ecc04ac/ba768/images/similarity-search-indexes16.jpg) Image from [pinecone.io](https://www.pinecone.io/learn/hnsw/)


It has several parameters that can be tuned to control the trade-off between search quality and index size or construction time. Here are some of the key parameters.

## Search Parameters
### efSearch
efSearch is the size of the dynamic list for the nearest neighbors used during the search. Higher efSearch values lead to more accurate but slower searches. efSearch cannot be set lower than the number of queried nearest neighbors k and can be any value between k and the size of the dataset.

## Construction Parameters
### M
M is the number of bi-directional links created for every new element during index construction. A reasonable range for M is 2-100. Higher M values work better on datasets with high intrinsic dimensionality and/or high recall, while lower M values work better for datasets with low intrinsic dimensionality and/or low recall. The parameter also determines the algorithms memory consumption, which is roughly M * 8-10 bytes per stored element.

### efConstruction
efConstruction controls the index construction time and accuracy. Bigger efConstruction values lead to longer construction times but better index quality. At some point, increasing efConstruction does not improve the quality of the index. To check if the selected efConstruction value is appropriate, measure recall for M nearest neighbor search when efSearch = efConstruction. If the recall is lower than 0.9, there is room for improvement.

## Parameter Selection for hnswlib-wasm

When using hnswlib-wasm, it is essential to choose appropriate values for M, efSearch, and efConstruction based on your datasets size and dimensionality. Since hnswlib-wasm is running in the browser, you should consider the available memory and performance limitations. Here are some recommendations:

### M: 
Choose a value in the range of 12-48, as it works well for most use cases. You may need to experiment to find the optimal value for your specific dataset.

### efSearch: 
Start with a value close to M and adjust it based on your desired trade-off between search speed and accuracy. Lower values will be faster but less accurate, while higher values will be more accurate but slower.

### efConstruction: 
Set this value considering the expected query volume. If you anticipate low query volume, you can set a higher value for efConstruction to improve recall with minimal impact on search time, especially when using lower M values.

Remember that higher M values will increase the memory usage of the index, so you should balance performance and memory constraints when choosing your parameters for hnswlib-wasm.

## Resources

[Learn hnsw by pinecone](https://www.pinecone.io/learn/hnsw/)

[Vector indexes by pinecone](https://www.pinecone.io/learn/vector-indexes/)

Images from [pinecone.io](https://www.pinecone.io/learn/hnsw/)
![](https://d33wubrfki0l68.cloudfront.net/f8df59c49b28522dea11e4293307af2e4f8d97ed/a6992/images/hnsw-9.jpg)
![](https://d33wubrfki0l68.cloudfront.net/e5194e6f5b1aad4b940e0d3f1957b71bf6c2f25b/40135/images/hnsw-10.jpg)
![](https://d33wubrfki0l68.cloudfront.net/1b0b0b0b5b1b0b0b0b0b0b0b0b0b0b0b0b0b0b0b/40135/images/hnsw-11.jpg)

# Other Notes
## License

hnswlib-wasm is available as open source under the terms of the [Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0).

## Contributing

To build
```
yarn install
make rebuild
yarn build
```

To test
```
yarn test
```


Contact @ShravanSunder first!