# hnswlib-wasm

This is a wasm version of [hnswlib](https://github.com/nmslib/hnswlib). Created by @ShravanSunder

Created with the help of library [hnswlib-node](https://github.com/yoshoku/hnswlib-node/).  See his wonderful docs here, [![documentation](https://img.shields.io/badge/api-reference-blue.svg)](https://yoshoku.github.io/hnswlib-node/doc/) Thanks @yoshoku! 

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