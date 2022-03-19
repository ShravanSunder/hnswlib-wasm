# hnswlib-node

[![npm version](https://badge.fury.io/js/hnswlib-node.svg)](https://badge.fury.io/js/hnswlib-node)
[![Build Status](https://github.com/yoshoku/hnswlib-node/actions/workflows/build.yml/badge.svg)](https://github.com/yoshoku/hnswlib-node/actions/workflows/build.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellowgreen.svg)](https://github.com/yoshoku/hnswlib-node/blob/main/LICENSE.txt)

hnswlib-node provides Node.js bindings for [Hnswlib](https://github.com/nmslib/hnswlib)
that implements approximate nearest-neghbor search based on
hierarchical navigable small world graphs.

## Installation

```sh
$ npm install hnswlib-node
```

## Documentation

* [hnswlib-node API Documentation](https://yoshoku.github.io/hnswlib-node/doc/)

## Usage

```typescript
import { HierarchicalNSW } from 'hnswlib-node'

const numDimensions = 8 // the length of data point vector that will be indexed.
const maxElements = 10 // the maximum number of data points.

// declaring and intializing index.
const index = new HierarchicalNSW('l2', numDimensions);
index.initIndex(maxElements);

// inserting data points to index.
for (let i = 0; i < maxElements; i++) {
  const point = new Array(numDimensions);
  for (let j = 0; j < numDimensions; j++) point[j] = Math.random();
  index.addPoint(point, i);
}

// preparing query data points.
const query = new Array(numDimensions);
for (let j = 0; j < numDimensions; j++) query[j] = Math.random();

// searching k-nearest neighbor data points.
const numNeighbors = 3
const result = index.searchKnn(query, numNeighbors);

console.table(result);

// saving index.
index.save('foo.dat');

// loading index.
const loadedIndex = new HierarchicalNSW('l2', 3);
loadedIndex.loadIndex('foo.dat');
```

## License

hnswlib-node is available as open source under the terms of the [Apache-2.0 License](https://www.apache.org/licenses/LICENSE-2.0).

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/yoshoku/hnswlib-node.
This project is intended to be a safe, welcoming space for collaboration,
and contributors are expected to adhere to the [Contributor Covenant](http://contributor-covenant.org) code of conduct.
