import { loadHnswlib } from "./loadHnswlib";
import {  HierarchicalNSW, HnswlibModule, InnerProductSpace, L2Space } from "~lib/hnswlib";
import { testErrors } from "./testErrors";
import { defaultParams } from "~lib/hnswlibDefaults";


describe("hnswlib.HierarchicalNSW", () => {
  let hnswlib: HnswlibModule;
  let index: HierarchicalNSW;

  beforeAll(async () => {
    // Instantiate the Emscripten module
    hnswlib = await loadHnswlib();
    index = new hnswlib.HierarchicalNSW("l2", 3);
  });

  it("loads the class", () => {
    expect(hnswlib.HierarchicalNSW).toBeDefined();
  });
  
  describe("#constructor", () => {
    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.HierarchicalNSW();
      }).toThrow("Tried to invoke ctor of HierarchicalNSW with invalid number of parameters (0) - expected (2) parameters instead!");
    });

    it("throws an error if given a non-String object to first argument", () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.HierarchicalNSW(1, 3);
      }).toThrow("Cannot pass non-string to std::string");
    });

    it("throws an error if given a non-Number object to second argument", () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.HierarchicalNSW("l2", "3");
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it('throws an error if given a String that is neither "l2", "ip", nor "cosine" to first argument', () => {
      expect(() => {
        // @ts-expect-error
        new hnswlib.HierarchicalNSW("coss", 3);
      }).toThrow('invalid space should be expected l2, ip, or cosine');
    });
  });

  describe("#initIndex", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
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
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it("initIndex it is true if initalized with defaults", () => {
      index.initIndex(5, ...defaultParams.initIndex);
      expect(
        index.isIndexInitialized()
      ).toBeTrue();
    });

    it("initIndex it is true if initalized", () => {
      index.initIndex(5, 16, 200, 1, true);
      expect(
        index.isIndexInitialized()
      ).toBeTrue();
    });

  });

  describe("#resizeIndex", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        index.resizeIndex();
      }).toThrow(testErrors.arugmentCount);
    });

    it("throws an error if given a non-Number argument", () => {
      expect(() => {
        // @ts-expect-error
        index.resizeIndex("0");
        
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.resizeIndex(5);
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("resize, marks the element as deleted", () => {
      index.initIndex(2, ...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0,...defaultParams.addPoint);
      index.addPoint([2, 3, 4], 1,...defaultParams.addPoint);
      expect(() => {
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      }).toThrow(/Hnswlib Error/);
      index.resizeIndex(3);
      index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      expect(index.getMaxElements()).toBe(3);
    });
  });

  describe("#getIdsList", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("returns an empty array if called before the index is initialized", () => {
      expect(index.getIdsList()).toMatchObject([]);
    });

    it("returns an array consists of label id", () => {
      index.initIndex(5,...defaultParams.initIndex);
      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
      expect(index.getIdsList()).toIncludeSameMembers([1, 0]);
    });
  });

  describe("#getPoint", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("when the index is not initialized, then throws when an empty array if called before the index is initialized", () => {
      expect(() => index.getPoint(0)).toThrow(testErrors.indexNotInitalized)
    });

    describe("when the index has some data points", () => {
      beforeAll(() => {
        index.initIndex(3, ...defaultParams.initIndex);
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      });

      it("throws an error if no arguments are given", () => {
        expect(() => {
          // @ts-expect-error
          index.getPoint();
        }).toThrow(testErrors.arugmentCount);
      });

      it("throws an error if given a non-Number argument", () => {
        expect(() => {
          // @ts-expect-error
          index.getPoint("0");
        }).toThrow(testErrors.unsignedIntArgument);
      });

      it("throws an error if specified a non-existent datum point", () => {
        expect(() => {
          index.getPoint(3);
        }).toThrow("Hnswlib Error: Label not found");
        index.resizeIndex(4);
        index.addPoint([4, 5, 6], 3, ...defaultParams.addPoint);
        index.markDelete(3);
        expect(() => {
          index.getPoint(3);
        }).toThrow("Hnswlib Error: Label not found");
      });

      it("returns stored datum point", () => {
        expect(index.getPoint(0)).toMatchObject([1, 2, 3]);
        expect(index.getPoint(1)).toMatchObject([2, 3, 4]);
        expect(index.getPoint(2)).toMatchObject([3, 4, 5]);
      });
    });
  });

  describe("#getMaxElements", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("returns 0 if called before the index is initialized", () => {
      expect(index.getMaxElements()).toBe(0);
    });

    it("returns maximum number of elements", () => {
      index.initIndex(10,...defaultParams.initIndex);      expect(index.getMaxElements()).toBe(10);
    });
  });

  describe("#getCurrentCount", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("returns 0 if called before the index is initialized", () => {
      expect(index.getCurrentCount()).toBe(0);
    });

    it("returns current number of elements", () => {
      index.initIndex(5,...defaultParams.initIndex);      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
      expect(index.getCurrentCount()).toBe(2);
    });
  });

  describe("#getNumDimensions", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("returns number of dimensions", () => {
      expect(index.getNumDimensions()).toBe(3);
    });
  });

  describe("#getEf", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.getEf();
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("returns ef parameter value", () => {
      index.initIndex(3, ...defaultParams.initIndex);
      expect(index.getEf()).toBe(10);
    });
  });

  describe("#setEf", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        index.setEf();
      }).toThrow(testErrors.arugmentCount);
    });

    it("throws an error if given a non-Number argument", () => {
      expect(() => {
        // @ts-expect-error
        index.setEf("0");
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.setEf(123);
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("sets ef parameter value", () => {
      index.initIndex(3, ...defaultParams.initIndex);
      index.setEf(123);
      expect(index.getEf()).toBe(123);
    });
  });

  describe("#addPoint", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        index.addPoint();
      }).toThrow(testErrors.arugmentCount);
    });

    it("throws an error if given a non-Array object to first argument", () => {
      expect(() => {
        // @ts-expect-error
        index.addPoint("[1, 2, 3]", 0, ...defaultParams.addPoint);
      }).toThrow(testErrors.vectorArgument);
    });

    it("throws an error if given a non-Number object to second argument", () => {
      expect(() => {
        // @ts-expect-error
        index.addPoint([1, 2, 3], "0");
      }).toThrow(testErrors.arugmentCount);
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("throws an error if given an array with a length different from the number of dimensions", () => {
      index.initIndex(1,...defaultParams.initIndex);      expect(() => {
        index.addPoint([1, 2, 3, 4, 5], 0, ...defaultParams.addPoint);
      }).toThrow(testErrors.vectorSize);
    });

    it("throws an error if more element is added than the maximum number of elements.", () => {
      index.initIndex(1,...defaultParams.initIndex);      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      expect(() => {
        index.addPoint([1, 2, 3], 1, ...defaultParams.addPoint);
      }).toThrow(/Hnswlib Error/);
    });
  });

  describe("#markDelete", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        index.markDelete();
      }).toThrow("Expected 1 arguments, but got 0.");
    });

    it("throws an error if given a non-Number argument", () => {
      expect(() => {
        // @ts-expect-error
        index.markDelete("0");
      }).toThrow("Invalid the first argument type, must be a number.");
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.markDelete(0);
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("marks the element as deleted", () => {
      index.initIndex(2,...defaultParams.initIndex);      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([1, 2, 4], 1, ...defaultParams.addPoint);
      index.markDelete(1);
      expect(index.searchKnn([1, 2, 4], 1, undefined).neighbors).toEqual([0]);
    });
  });

  describe("#unmarkDelete", () => {
    beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        index.unmarkDelete();
      }).toThrow(testErrors.arugmentCount);
    });

    it("throws an error if given a non-Number argument", () => {
      expect(() => {
        // @ts-expect-error
        index.unmarkDelete("0");
      }).toThrow(testErrors.unsignedIntArgument);
    });

    it("throws an error if called before the index is initialized", () => {
      expect(() => {
        index.unmarkDelete(0);
      }).toThrow(
        "Search index has not been initialized, call `initIndex` in advance."
      );
    });

    it("unmarks the element as deleted", () => {
      index.initIndex(2,...defaultParams.initIndex);      index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
      index.addPoint([1, 2, 4], 1, ...defaultParams.addPoint);
      index.markDelete(1);
      expect(index.searchKnn([1, 2, 4], 1, undefined).neighbors).toEqual([0]);
      index.unmarkDelete(1);
      expect(index.searchKnn([1, 2, 4], 1, undefined).neighbors).toEqual([1]);
    });
  });

  describe("#searchKnn", () => {
    describe('when metric space is "l2"', () => {
      beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });

      beforeAll(() => {
        index.initIndex(3, ...defaultParams.initIndex);
        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
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
          index.searchKnn("[1, 2, 3]", 2, undefined);
        }).toThrow(testErrors.vectorArgument);
      });

      it("throws an error if given a non-Number object to second argument", () => {
        expect(() => {
          // @ts-expect-error
          index.searchKnn([1, 2, 3], "2", undefined);
        }).toThrow(testErrors.unsignedIntArgument);
      });

      it("throws an error if given a non-Function to third argument", () => {
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
        index = new hnswlib.HierarchicalNSW("ip", 3);
      });
      

      beforeAll(() => {
        index.initIndex(3,...defaultParams.initIndex);        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
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
        index = new hnswlib.HierarchicalNSW("cosine", 3);
      });

      beforeAll(() => {
        index.initIndex(3,...defaultParams.initIndex);        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([2, 3, 4], 1, ...defaultParams.addPoint);
        index.addPoint([3, 4, 5], 2, ...defaultParams.addPoint);
      });

      it("returns search results based on one minus cosine similarity", () => {
        const res = index.searchKnn([1, 2, 5], 2,undefined);
        expect(res.neighbors).toMatchObject([0, 1]);
        expect(res.distances[0]).toBeCloseTo(
          1.0 - 20.0 / (Math.sqrt(14) * Math.sqrt(30)),
          6
        );
        expect(res.distances[1]).toBeCloseTo(
          1.0 - 28.0 / (Math.sqrt(29) * Math.sqrt(30)),
          6
        );
      });
    });

    describe("when filter function is given", () => {
      beforeAll(() => {
      index = new hnswlib.HierarchicalNSW("l2", 3);
    });
      const filter = (label:number) => label % 2 == 0;

      beforeAll(() => {
        index.initIndex(4,...defaultParams.initIndex);        index.addPoint([1, 2, 3], 0, ...defaultParams.addPoint);
        index.addPoint([1, 2, 5], 1, ...defaultParams.addPoint);
        index.addPoint([1, 2, 4], 2, ...defaultParams.addPoint);
        index.addPoint([1, 2, 5], 3, ...defaultParams.addPoint);
      });

      it("returns filtered search results", () => {
        expect(index.searchKnn([1, 2, 5], 4, filter)).toMatchObject({
          distances: [1, 4],
          neighbors: [2, 0],
        });
      });
    });
  });
});
