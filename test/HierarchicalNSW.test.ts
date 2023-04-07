import { defaultParams, HierarchicalNSW, HnswlibModule, loadHnswlib } from '~dist/hnswlib';
import { adaDimensions, createVectorData, getIdbFileList, testErrors } from '~test/testHelpers';
import 'fake-indexeddb/auto';
import { indexedDB } from 'fake-indexeddb';
import { expect } from 'vitest';

describe('hnswlib.HierarchicalNSW', () => {
  let hnswlib: HnswlibModule;
  let index: HierarchicalNSW;

  beforeAll(async () => {
    // Instantiate the Emscripten module
    hnswlib = await loadHnswlib();
    index = new hnswlib.HierarchicalNSW('l2', 3);
  });

  afterEach(() => {
    process.stdout.write('');
  });

  it('loads the class', () => {
    expect(hnswlib.HierarchicalNSW).toBeDefined();
  });

  describe('#constructor', () => {
    it('throws an error if no arguments are given', () => {
      expect(() => {
        // @ts-expect-error for testing
        new hnswlib.HierarchicalNSW();
      }).toThrow(
        'Tried to invoke ctor of HierarchicalNSW with invalid number of parameters (0) - expected (2) parameters instead!'
      );
    });

    it('throws an error if given a non-String object to first argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        new hnswlib.HierarchicalNSW(1, 3);
      }).toThrow('Cannot pass non-string to std::string');
    });

    it('throws an error if given a non-Number object to second argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        new hnswlib.HierarchicalNSW('l2', '3');
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('throws an error if given a String that is neither "l2", "ip", nor "cosine" to first argument', () => {
      expect(() => {
        new hnswlib.HierarchicalNSW('coss', 3);
      }).toThrow(/invalid space should be expected l2, ip, or cosine/);
    });
  });

  describe('#initIndex', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('isIndexInitialized is false before init', () => {
      expect(index.isIndexInitialized()).toBe(false);
    });

    it('throws an error if no arguments are given', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.initIndex();
      }).toThrow(testErrors.arugmentCount);
    });

    it('throws an error if given a non-Number argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.initIndex('5', 16, 200, 1, 1);
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('initIndex it is true if initialized with defaults', () => {
      index.initIndex(5, ...defaultParams.initIndex);
      expect(index.isIndexInitialized()).toBe(true);
    });

    it('initIndex it is true if initialized', () => {
      index.initIndex(5, 16, 200, 1, true);
      expect(index.isIndexInitialized()).toBe(true);
    });
  });

  describe('#resizeIndex', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws an error if no arguments are given', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.resizeIndex();
      }).toThrow(testErrors.arugmentCount);
    });

    it('throws an error if given a non-Number argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.resizeIndex('0');
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('throws an error if called before the index is initialized', () => {
      expect(() => {
        index.resizeIndex(5);
      }).toThrow('Search index has not been initialized, call `initIndex` in advance.');
    });

    it('resize, marks the element as deleted', () => {
      index.initIndex(2, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
      expect(() => {
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      }).toThrow(testErrors.indexSize);
      index.resizeIndex(3);
      index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      expect(index.getMaxElements()).toBe(3);
    });
  });

  describe('#getIdsList', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('returns an empty array if called before the index is initialized', () => {
      expect(index.getIdsList()).toMatchObject([]);
    });

    it('returns an array consists of label id', () => {
      index.initIndex(5, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
      expect(index.getIdsList()).toEqual(expect.arrayContaining([0, 1]));
    });
  });

  describe('#getPoint', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('when the index is not initialized, then throws when an empty array if called before the index is initialized', () => {
      expect(() => index.getPoint(0)).toThrow(testErrors.indexNotInitalized);
    });

    describe('when the index has some data points', () => {
      beforeAll(() => {
        index.initIndex(3, ...defaultParams.initIndex);
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      });

      it('throws an error if no arguments are given', () => {
        expect(() => {
          // @ts-expect-error for testing
          index.getPoint();
        }).toThrow(testErrors.arugmentCount);
      });

      it('throws an error if given a non-Number argument', () => {
        expect(() => {
          // @ts-expect-error for testing
          index.getPoint('0');
        }).toThrow(testErrors.unsignedIntArgument);
      });

      it('throws an error if specified a non-existent datum point', () => {
        expect(() => {
          index.getPoint(3);
        }).toThrow('Hnswlib Error: Label not found');
        index.resizeIndex(4);
        index.addPoint([4, 5, 6], 3, ...defaultParams.addPoint);
        index.markDelete(3);
        expect(() => {
          index.getPoint(3);
        }).toThrow('Hnswlib Error: Label not found');
      });

      it('returns stored datum point', () => {
        expect(index.getPoint(0)).toMatchObject([1, 2, 3]);
        expect(index.getPoint(1)).toMatchObject([2, 3, 4]);
        expect(index.getPoint(2)).toMatchObject([3, 4, 5]);
      });
    });
  });

  describe('#getMaxElements', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws if called before the index is initialized', () => {
      expect(() => index.getMaxElements()).toThrow(testErrors.indexNotInitalized);
    });

    it('returns maximum number of elements', () => {
      index.initIndex(10, ...defaultParams.initIndex);
      expect(index.getMaxElements()).toBe(10);
    });
  });

  describe('#getCurrentCount', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws error if called before the index is initialized', () => {
      expect(() => index.getCurrentCount()).toThrow(testErrors.indexNotInitalized);
    });

    it('returns current number of elements', () => {
      index.initIndex(5, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
      expect(index.getCurrentCount()).toBe(2);
    });
  });

  describe('#getNumDimensions', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('returns number of dimensions', () => {
      expect(index.getNumDimensions()).toBe(3);
    });
  });

  describe('#getEf', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws an error if called before the index is initialized', () => {
      expect(() => {
        index.getEfSearch();
      }).toThrow('Search index has not been initialized, call `initIndex` in advance.');
    });

    it('returns ef parameter value', () => {
      index.initIndex(3, ...defaultParams.initIndex);
      expect(index.getEfSearch()).toBe(10);
    });
  });

  describe('#setEf', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws an error if no arguments are given', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.setEfSearch();
      }).toThrow(testErrors.arugmentCount);
    });

    it('throws an error if given a non-Number argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.setEfSearch('0');
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('throws an error if called before the index is initialized', () => {
      expect(() => {
        index.setEfSearch(123);
      }).toThrow('Search index has not been initialized, call `initIndex` in advance.');
    });

    it('sets ef parameter value', () => {
      index.initIndex(3, ...defaultParams.initIndex);
      index.setEfSearch(123);
      expect(index.getEfSearch()).toBe(123);
    });
  });

  describe('#addPoint', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws an error if no arguments are given', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.addPoint();
      }).toThrow(testErrors.arugmentCount);
    });

    it('throws an error if given a non-Array object to first argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.addPoint('[1, 2, 3]', 0, ...defaultParams.addPoint);
      }).toThrow(testErrors.vectorArgument);
    });

    it('throws an error if given a non-Number object to second argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.addPoint([1, 2, 3], '0');
      }).toThrow(testErrors.arugmentCount);
    });

    it('throws an error if called before the index is initialized', () => {
      expect(() => {
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      }).toThrow('Search index has not been initialized, call `initIndex` in advance.');
    });

    it('throws an error if given an array with a length different from the number of dimensions', () => {
      index.initIndex(1, ...defaultParams.initIndex);
      expect(() => {
        index.addPoint([1, 2, 3, 4, 5], 0, ...defaultParams.addPoint);
      }).toThrow(testErrors.vectorSize);
    });

    it('throws an error if more element is added than the maximum number of elements.', () => {
      index.initIndex(1, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      expect(() => {
        index.addPoint([1, 2, 3], 1, ...defaultParams.addPoint);
      }).toThrow(testErrors.indexSize);
    });
  });

  describe('#markDelete', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws an error if no arguments are given', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.markDelete();
      }).toThrow(testErrors.arugmentCount);
    });

    it('throws an error if given a non-Number argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.markDelete('0');
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('throws an error if called before the index is initialized', () => {
      expect(() => {
        index.markDelete(0);
      }).toThrow(testErrors.indexNotInitalized);
    });

    it('marks the element as deleted', () => {
      index.initIndex(2, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([1, 2, 4], 1, ...defaultParams.addPoint);
      index.markDelete(1);
      expect(index.searchKnn([1, 2, 4], 1, undefined).neighbors).toEqual([0]);
    });
  });

  describe('#unmarkDelete', () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW('l2', 3);
    });

    it('throws an error if no arguments are given', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.unmarkDelete();
      }).toThrow(testErrors.arugmentCount);
    });

    it('throws an error if given a non-Number argument', () => {
      expect(() => {
        // @ts-expect-error for testing
        index.unmarkDelete('0');
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('throws an error if called before the index is initialized', () => {
      expect(() => {
        index.unmarkDelete(0);
      }).toThrow('Search index has not been initialized, call `initIndex` in advance.');
    });

    it('unmarks the element as deleted', () => {
      index.initIndex(2, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([1, 2, 4], 1, ...defaultParams.addPoint);
      index.markDelete(1);
      expect(index.searchKnn([1, 2, 4], 1, undefined).neighbors).toEqual([0]);
      index.unmarkDelete(1);
      expect(index.searchKnn([1, 2, 4], 1, undefined).neighbors).toEqual([1]);
    });
  });

  describe('#searchKnn', () => {
    describe('when metric space is "l2"', () => {
      beforeAll(() => {
        index = new hnswlib.HierarchicalNSW('l2', 3);
      });

      beforeAll(() => {
        index.initIndex(3, ...defaultParams.initIndex);
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      });

      it('throws an error if no arguments are given', () => {
        expect(() => {
          // @ts-expect-error for testing
          index.searchKnn();
        }).toThrow(testErrors.arugmentCount);
      });

      it('throws an error if given a non-Array object to first argument', () => {
        expect(() => {
          // @ts-expect-error for testing
          index.searchKnn('[1, 2, 3]', 2, undefined);
        }).toThrow(testErrors.vectorArgument);
      });

      it('throws an error if given a non-Number object to second argument', () => {
        expect(() => {
          // @ts-expect-error for testing
          index.searchKnn([1, 2, 3], '2', undefined);
        }).toThrow(testErrors.unsignedIntArgument);
      });

      it('throws an error if given a non-Function to third argument', () => {
        expect(() => {
          // @ts-expect-error for testing
          index.searchKnn([1, 2, 3], 2, 'fnc');
        }).toThrow(testErrors.isNotFunction);
      });

      it('throws an error if given the number of neighborhoods exceeding the maximum number of elements', () => {
        expect(() => {
          index.searchKnn([1, 2, 5], 4, undefined);
        }).toThrow(
          'Invalid the number of k-nearest neighbors (cannot be given a value greater than `maxElements`: 3).'
        );
      });

      it('throws an error if given an array with a length different from the number of dimensions', () => {
        expect(() => {
          index.searchKnn([1, 2, 5, 4], 2, undefined);
        }).toThrow('Invalid the given array length (expected 3, but got 4).');
      });

      it('returns search results based on squared Euclidean distance', () => {
        expect(index.searchKnn([1, 2, 5], 2, undefined)).toMatchObject({
          distances: [3, 4],
          neighbors: [1, 0],
        });
      });
    });

    describe('when metric space is "ip"', () => {
      beforeAll(() => {
        index = new hnswlib.HierarchicalNSW('ip', 3);
      });

      beforeAll(() => {
        index.initIndex(3, ...defaultParams.initIndex);
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      });

      it('returns search results based on one minus inner product', () => {
        expect(index.searchKnn([1, 2, 5], 2, undefined)).toMatchObject({
          distances: [-35, -27],
          neighbors: [2, 1],
        });
      });
    });

    describe('when metric space is "cosine"', () => {
      beforeAll(() => {
        index = new hnswlib.HierarchicalNSW('cosine', 3);
      });

      beforeAll(() => {
        index.initIndex(3, ...defaultParams.initIndex);
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      });

      it('returns search results based on one minus cosine similarity', () => {
        const res = index.searchKnn([1, 2, 5], 2, undefined);
        expect(res.neighbors).toMatchObject([0, 1]);
        expect(res.distances[0]).toBeCloseTo(1.0 - 20.0 / (Math.sqrt(14) * Math.sqrt(30)), 6);
        expect(res.distances[1]).toBeCloseTo(1.0 - 28.0 / (Math.sqrt(29) * Math.sqrt(30)), 6);
      });
    });

    describe('when filter function is given', () => {
      beforeAll(() => {
        index = new hnswlib.HierarchicalNSW('l2', 3);
      });
      const filter = (label: number) => label % 2 == 0;

      beforeAll(() => {
        index.initIndex(4, ...defaultParams.initIndex);
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([1, 2, 5], 1, ...defaultParams.addPoint);
        index.addPoint([1, 2, 4], 2, ...defaultParams.addPoint);
        index.addPoint([1, 2, 5], 3, ...defaultParams.addPoint);
      });

      it('returns filtered search results', () => {
        expect(index.searchKnn([1, 2, 5], 4, filter)).toMatchObject({
          distances: [1, 4],
          neighbors: [2, 0],
        });
      });
    });
  });

  describe('#read and write index', () => {
    const localIndexLocation = './tmp/testindex.dat';
    const filename = 'testindex.dat';
    beforeAll(async () => {
      index = new hnswlib.HierarchicalNSW('ip', 3);
    });

    beforeEach(() => {
      index.initIndex(3, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
      index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      expect(index.getPoint(0)).toMatchObject([1, 2, 3]);
      index.writeIndex(filename);
    });

    it('can write a file and the idb database exists', async () => {
      const db = await indexedDB.open('/hnswlib-indexes');
      //const files = await getIdbFileList(db);
      //console.log('stfuff',files);
      expect(db).not.eql(null);
    });

    it('can write a file and read the index back', async () => {
      index = new hnswlib.HierarchicalNSW('ip', 3);
      expect(() => index.getPoint(1)).toThrow(testErrors.indexNotInitalized);
      index.readIndex('testindex.dat', false);
      expect(index.getPoint(1)).toMatchObject([2, 3, 4]);
    });
  });

  describe('when a large block of data and dimensions is loaded', () => {
    const baseIndexSize = 1000;
    const testVectorData = createVectorData(baseIndexSize - 1, adaDimensions);
    beforeEach(async () => {
      index = new hnswlib.HierarchicalNSW('l2', adaDimensions);
    });

    it(`when loading ${baseIndexSize} points, then they can be loaded and removed`, () => {
      index.initIndex(baseIndexSize, ...defaultParams.initIndex);
      index.addItems(testVectorData.vectors, testVectorData.labels, ...defaultParams.addPoint);
      const label = testVectorData.labels[1];
      const point = testVectorData.vectors[1];
      expect(index.getPoint(label)).toMatchObject(point);
      //index.writeIndex(filename);
    });
  });

  describe('searchKnn with 1000', async () => {
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
        index.setEfSearch(efSearch);
      }
    };

    it(`m=64, efConstruction=16, efSearch=16`, async () => {
      await setup(48, 24, 16);
      expect(index.searchKnn(testVectorData.vectors[10], 10, undefined)).not.toBeNull();
    });
  });
});
