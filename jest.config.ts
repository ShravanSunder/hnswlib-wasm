



import type { JestConfigWithTsJest } from 'ts-jest'


//import { defaults as tsjPreset } from 'ts-jest/presets'
// import { defaultsESM as tsjPreset } from 'ts-jest/presets';
// import { jsWithTs as tsjPreset } from 'ts-jest/presets';
 import { jsWithTsESM as tsjPreset } from 'ts-jest/presets';
// import { jsWithBabel as tsjPreset } from 'ts-jest/presets';
// import { jsWithBabelESM as tsjPreset } from 'ts-jest/presets';

const jestConfig: JestConfigWithTsJest = {
  verbose: true,
  testEnvironment: "node",
  setupFilesAfterEnv: ["jest-extended/all"],
  extensionsToTreatAsEsm: [".ts", ".mts", ],
  transform: {
    ...tsjPreset.transform,
    // [...]
  },
  moduleNameMapper: {
    "^~lib/(.*)$": "<rootDir>/lib/$1",
    "^~test/(.*)$": "<rootDir>/test/$1",
  },
}

console.warn("----------------------------------------");
console.warn("----------------------------------------");
console.warn("              NEW TEST RUN");
console.warn("----------------------------------------");
console.warn("----------------------------------------");

export default jestConfig