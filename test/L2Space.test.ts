import { testErrors } from "./errors";
import { HnswlibModule, L2Space } from "~lib/hnswlib";
import { loadHnswlib } from "./loadHnswlib";

describe("L2Space", () => {
  let hnswlib: HnswlibModule;
  let space: L2Space;

  beforeAll(async () => {
    // Instantiate the Emscripten module
    hnswlib = await loadHnswlib();
    space = new hnswlib.L2Space(3);
  });

  it("throws an error if no arguments are given", () => {
    expect(() => {
      // @ts-expect-error
      new hnswlib.L2Space();
    }).toThrow(
      "Tried to invoke ctor of L2Space with invalid number of parameters (0) - expected (1) parameters instead!"
    );
  });

  it("throws an error if given a non-Number argument", () => {
    expect(() => {
      // @ts-expect-error
      new hnswlib.L2Space("yes");
      
    }).toThrow("Cannot convert \"yes\" to unsigned int");
  });

  describe("#getNumDimensions", () => {
    it("returns number of dimensions", () => {
      expect(space.getNumDimensions()).toBe(3);
    });
  });

  describe("#distance", () => {
    it("throws an error if no arguments are given", () => {
      expect(() => {
        // @ts-expect-error
        space.distance();
      }).toThrow(/function L2Space.distance called with 0 arguments, expected 2 args!/);
    });

    it("throws an error if 1 argument are given", () => {
      expect(() => {
        // @ts-expect-error
        space.distance([1,1,3]);
      }).toThrow(/function L2Space.distance called with 1 arguments, expected 2 args!/);
    });

    it("throws an error if given a non-Array argument", () => {
      expect(() => {
        // @ts-expect-error
        space.distance("foo", [0, 1, 2]);
      }).toThrow();
      expect(() => {
        // @ts-expect-error
        space.distance([0, 1, 2], "bar");
      }).toThrow(testErrors.vectorArgument)
    });

    it("throws an error if given an array with a length different from the number of dimensions", () => {
      expect(() => {
        space.distance([0, 1, 2, 3], [3, 4, 5]);
      }).toThrow(testErrors.vectorSize);
      expect(() => {
        space.distance([0, 1, 2], [3, 4, 5, 6]);
      }).toThrow(testErrors.vectorSize);
    });

    it("calculates squared Euclidean distance between two arrays", () => {
      // @ts-ignore
      //expect(space.distance(new Float32Array([1, 2, 3]), new Float32Array([3, 4, 5]))).toBeCloseTo(12.0, 8);
      expect(space.distance([1, 2, 3], [3, 4, 5])).toBeCloseTo(12.0, 8);
      // expect(space.distance([0.1, 0.2, 0.3], [0.3, 0.4, 0.5])).toBeCloseTo(
      //   0.12,
      //   8
      // );
    });
  });
});
