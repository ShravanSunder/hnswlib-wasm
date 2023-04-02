import { loadHnswlib } from "./loadHnswlib";
import {  BruteforceSearch, HnswlibModule, } from "~lib/hnswlib";
import { testErrors } from "./testErrors";
import { defaultParams } from "~lib/hnswlibDefaults";

describe("BruteforceSearch", () => {
  let hnswlib: HnswlibModule;
  let index: BruteforceSearch;

  beforeAll(async () => {
    // Instantiate the Emscripten module
    hnswlib = await loadHnswlib();
    index = new hnswlib.BruteforceSearch("l2", 3);
  });

  describe("#constructor", () => {
    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.BruteforceSearch();
      }).toThrow("Tried to invoke ctor of BruteforceSearch with invalid number of parameters (0) - expected (2) parameters instead!");
    });

    it("throws an error if given a non-String object to first argument", () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.BruteforceSearch(1, 3);
      }).toThrow("Cannot pass non-string to std::string");
    });

    it("throws an error if given a non-Number object to second argument", () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.BruteforceSearch("l2", "3");
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('throws an error if given a String that is neither "l2", "ip", nor "cosine" to first argument', () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.BruteforceSearch("coss", 3);
      }).toThrow('invalid space should be expected l2, ip, or cosine');
    });
  });

  describe("#initIndex", () => {
    beforeAll(() => {
      index = new hnswlib.BruteforceSearch("l2", 3);
    });


    it("isIndexInitialized is false before init", () => {
      expect(
        index.isIndexInitialized()
      ).toBeFalse()
    });

    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        index.initIndex();
      }).toThrow(testErrors.arugmentCount);
    });

    it("throws an error if given a non-Number argument", () => {
      expect(() => {
        // @ts-expect-error
        index.initIndex("5", 16, 200, 1, 1);
      }).toThrow(testErrors.arugmentCount);
    });

    it("initIndex it is true if initalized with defaults", () => {
      index.initIndex(5, );
      expect(
        index.isIndexInitialized()
      ).toBeTrue();
    });

  });

  describe("#getMaxElements", () => {
    beforeAll(() => {
      index = new hnswlib.BruteforceSearch("l2", 3);
    });

    it("throws if called before the index is initialized", () => {
      expect(() => index.getMaxElements()).toThrow(testErrors.indexNotInitalized);
    });

    it("returns maximum number of elements", () => {
      index.initIndex(10, );
      expect(index.getMaxElements()).toBe(10);
    });
  });

  describe("#getCurrentCount", () => {
    beforeAll(() => {
      index = new hnswlib.BruteforceSearch("l2", 3);
    });

    it("returns 0 if called before the index is initialized", () => {
      expect(() => index.getCurrentCount()).toThrow(testErrors.indexNotInitalized);
    });

    it("returns current number of elements", () => {
      index.initIndex(5, );
      index.addPoint([1, 2, 3], 0);
      index.addPoint([2, 3, 4], 1);
      expect(index.getCurrentCount()).toBe(2);
    });
  });

  describe("#getNumDimensions", () => {
    beforeAll(() => {
      index = new hnswlib.BruteforceSearch("l2", 3);
    });

    it("returns number of dimensions", () => {
      expect(index.getNumDimensions()).toBe(3);
    });
  });

  describe("#addPoint", () => {
    beforeAll(() => {
      index = new hnswlib.BruteforceSearch("l2", 3);
    });

    it("throws an error if given a non-Array object to first argument", () => {
      expect(() => {
        // @ts-expect-error
        index.addPoint("[1, 2, 3]", 0);
      }).toThrow(testErrors.vectorArgument);
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.addPoint([1, 2, 3], 0);
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("throws an error if given an array with a length different from the number of dimensions", () => {
      index.initIndex(1, );
      expect(() => {
        index.addPoint([1, 2, 3, 4, 5], 0);
      }).toThrow(testErrors.vectorSize);
    });

    it("throws an error if more element is added than the maximum number of elements.", () => {
      index.initIndex(1, );
      index.addPoint([1, 2, 3], 0);
      expect(() => {
        index.addPoint([1, 2, 3], 1);
      }).toThrow(testErrors.indexSize);
    });
  });

  describe("#removePoint", () => {
    beforeAll(() => {
      index = new hnswlib.BruteforceSearch("l2", 3);
    });

    it("throws an error if given a non-Number argument", () => {
      expect(() => {
        // @ts-expect-error
        index.removePoint("0");
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.removePoint(0);
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("removes the element specified by index", () => {
      index.initIndex(2, );
      index.addPoint([1, 2, 3], 0);
      index.addPoint([1, 2, 4], 1);
      expect(index.getCurrentCount()).toBe(2);
      index.removePoint(1);
      expect(index.getCurrentCount()).toBe(1);
      expect(index.searchKnn([1, 2, 4], 1, undefined).neighbors).toEqual([0]);
    });
  });

  describe("#searchKnn", () => {
    describe('when metric space is "l2"', () => {
      beforeAll(() => {
      index = new hnswlib.BruteforceSearch("l2", 3);
    });

      beforeAll(() => {
        index.initIndex(3, );
        index.addPoint([1, 2, 3], 0);
        index.addPoint([2, 3, 4], 1);
        index.addPoint([3, 4, 5], 2);
      });

      it("throws an error if no arguments are given", () => {
        expect(() => {
          // @ts-expect-error
          index.searchKnn();
        }).toThrow(testErrors.arugmentCount);
      });

      it("throws an error if given a non-Array object to first argument", () => {
        expect(() => {
          // @ts-expect-error
          index.searchKnn("[1, 2, 3]", 2);
        }).toThrow(testErrors.arugmentCount);
      });

      it("throws an error if given a non-Function object to third argument", () => {
        expect(() => {
          // @ts-expect-error
          index.searchKnn([1, 2, 3], 2, "fnc");
        }).toThrow(testErrors.isNotFunction);
      });

      it("throws an error if given the number of neighborhoods exceeding the maximum number of elements", () => {
        expect(() => {
          index.searchKnn([1, 2, 5], 4, undefined);
        }).toThrow(
          "Invalid the number of k-nearest neighbors (cannot be given a value greater than `maxElements`: 3)."
        );
      });

      it("throws an error if given an array with a length different from the number of dimensions", () => {
        expect(() => {
          index.searchKnn([1, 2, 5, 4], 2, undefined);
        }).toThrow("Invalid the given array length (expected 3, but got 4).");
      });

      it("returns search results based on squared Euclidean distance", () => {
        expect(index.searchKnn([1, 2, 5], 2, undefined)).toMatchObject({
          distances: [3, 4],
          neighbors: [1, 0],
        });
      });
    });

    describe('when metric space is "ip"', () => {
      beforeAll(() => {
        index = new hnswlib.BruteforceSearch("ip", 3);
      });

      beforeAll(() => {
        index.initIndex(3, );
        index.addPoint([1, 2, 3], 0);
        index.addPoint([2, 3, 4], 1);
        index.addPoint([3, 4, 5], 2);
      });

      it("returns search results based on one minus inner product", () => {
        expect(index.searchKnn([1, 2, 5], 2, undefined)).toMatchObject({
          distances: [-35, -27],
          neighbors: [2, 1],
        });
      });
    });

    describe('when metric space is "cosine"', () => {
      beforeAll(() => {
        index = new hnswlib.BruteforceSearch("cosine", 3);
      });

      beforeAll(() => {
        index.initIndex(3, );
        index.addPoint([1, 2, 3], 0);
        index.addPoint([2, 3, 4], 1);
        index.addPoint([3, 4, 5], 2);
      });

      it("returns search results based on one minus cosine similarity", () => {
        const result = index.searchKnn([1, 2, 5], 2, undefined);
        expect(result.neighbors).toMatchObject([0, 1]);
        expect(result.distances[0]).toBeCloseTo(
          1.0 - 20.0 / (Math.sqrt(14) * Math.sqrt(30)),
          6
        );
        expect(result.distances[1]).toBeCloseTo(
          1.0 - 28.0 / (Math.sqrt(29) * Math.sqrt(30)),
          6
        );
      });
    });

    describe("when filter function is given", () => {
      beforeAll(() => {
        index = new hnswlib.BruteforceSearch("l2", 3);
      });
      

      beforeAll(() => {
        index.initIndex(4, );
        index.addPoint([1, 2, 3], 0);
        index.addPoint([1, 2, 5], 1);
        index.addPoint([1, 2, 4], 2);
        index.addPoint([1, 2, 5], 3);
      });

      it("returns filtered search results", () => {
        const filter = (label: number) => label % 2 == 0;
        expect(index.searchKnn([1, 2, 5], 4, filter)).toMatchObject({
          distances: [1, 4],
          neighbors: [2, 0],
        });
      });
    });
  });
});
