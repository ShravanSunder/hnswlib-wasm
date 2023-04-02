// app.js
const path = require("path");
const hnswlib = require("../lib/hnswlib.js");
const fs = require("fs/promises");

describe("L2Space", () => {
  let library;
  let space;

  beforeAll(async () => {
    // Instantiate the Emscripten module
    try {
      const wasmPath = path.join(__dirname, "..", "lib", "hnswlib.wasm");
      const wasmBinary = await fs.readFile(wasmPath);
      const wasmModule = await WebAssembly.compile(wasmBinary);
      library = await hnswlib({
        wasmBinary,
        onRuntimeInitialized: () => {
          console.log("Runtime initialized");
        },
      });

      //space = new library.L2Space(3);
    } catch (err) {
      console.error("----------------------------------------");
      console.error("Error initializing the library:", err);
    }
  });

  it("throws an error if no arguments are given", () => {
    expect(() => {
      new library.L2Space();
    }).toThrow(
      "Tried to invoke ctor of L2Space with invalid number of parameters (0) - expected (1) parameters instead!"
    );
  });

  // it("throws an error if given a non-Number argument", () => {
  //   expect(() => {
  //     new library.L2Space("yes");
  //   }).toThrow("Invalid the first argument type, must be a number.");
  // });

  // describe("#getNumDimensions", () => {
  //   it("returns number of dimensions", () => {
  //     expect(space.getNumDimensions()).toBe(3);
  //   });
  // });

  // describe("#distance", () => {
  //   it("throws an error if no arguments are given", () => {
  //     expect(() => {
  //       space.distance();
  //     }).toThrow("Expected 2 arguments, but got 0.");
  //   });

  //   it("throws an error if given a non-Array argument", () => {
  //     expect(() => {
  //       space.distance("foo", [0, 1, 2]);
  //     }).toThrow("Invalid the first argument type, must be an Array.");
  //     expect(() => {
  //       space.distance([0, 1, 2], "bar");
  //     }).toThrow("Invalid the second argument type, must be an Array.");
  //   });

  //   it("throws an error if given an array with a length different from the number of dimensions", () => {
  //     expect(() => {
  //       space.distance([0, 1, 2, 3], [3, 4, 5]);
  //     }).toThrow("Invalid the first array length (expected 3, but got 4).");
  //     expect(() => {
  //       space.distance([0, 1, 2], [3, 4, 5, 6]);
  //     }).toThrow("Invalid the second array length (expected 3, but got 4).");
  //   });

  //   it("calculates squared Euclidean distance between two arrays", () => {
  //     expect(space.distance([1, 2, 3], [3, 4, 5])).toBeCloseTo(12.0, 8);
  //     expect(space.distance([0.1, 0.2, 0.3], [0.3, 0.4, 0.5])).toBeCloseTo(
  //       0.12,
  //       8
  //     );
  //   });
});
