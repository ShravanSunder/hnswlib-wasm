/* eslint-disable @typescript-eslint/ban-ts-comment */
import { HnswlibModule, InnerProductSpace, loadHnswlib } from '~lib/index';
import { testErrors } from '~test/testHelpers';

describe('InnerProductSpace', () => {
  let hnswlib: HnswlibModule;
  let space: InnerProductSpace;

  beforeAll(async () => {
    // Instantiate the Emscripten module
    hnswlib = await loadHnswlib();
    space = new hnswlib.InnerProductSpace(3);
  });

  it('throws an error if no arguments are given', () => {
    expect(() => {
      //@ts-expect-error
      new hnswlib.InnerProductSpace();
    }).toThrow(
      'Tried to invoke ctor of InnerProductSpace with invalid number of parameters (0) - expected (1) parameters instead!'
    );
  });

  it('throws an error if given a non-Number argument', () => {
    expect(() => {
      //@ts-expect-error
      new hnswlib.InnerProductSpace('yes');
    }).toThrow(testErrors.unsignedIntArgument);
  });

  describe('#getNumDimensions', () => {
    it('returns number of dimensions', () => {
      expect(space.getNumDimensions()).toBe(3);
    });
  });

  describe('#distance', () => {
    it('throws an error if no arguments are given', () => {
      expect(() => {
        //@ts-expect-error
        space.distance();
      }).toThrow('function InnerProductSpace.distance called with 0 arguments, expected 2 args!');
    });

    it('throws an error if given a non-Array argument', () => {
      expect(() => {
        //@ts-expect-error
        space.distance('foo', [0, 1, 2]);
      }).toThrow(testErrors.vectorArgument);
      expect(() => {
        //@ts-expect-error
        space.distance([0, 1, 2], 'bar');
      }).toThrow(testErrors.vectorArgument);
    });

    it('throws an error if given an array with a length different from the number of dimensions', () => {
      expect(() => {
        space.distance([0, 1, 2, 3], [3, 4, 5]);
      }).toThrow(testErrors.vectorSize);
      expect(() => {
        space.distance([0, 1, 2], [3, 4, 5, 6]);
      }).toThrow(testErrors.vectorSize);
    });

    it('calculates one minus inner product between two arrays', () => {
      expect(space.distance([1, 2, 3], [3, 4, 5])).toBeCloseTo(-25.0, 6);
      expect(space.distance([0.1, 0.2, 0.3], [0.3, 0.4, 0.5])).toBeCloseTo(0.74, 6);
    });
  });
});
