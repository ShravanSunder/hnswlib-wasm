// import { EsbuildPhoenix } from '@xn-sakina/phoenix'

import 'fake-indexeddb/auto';
import { HnswlibModule, loadHnswlib } from './dist/hnswlib';

export async function teardown() {
  //process.stdout.write("");
}

const lib = await loadHnswlib();

vi.stubGlobal('testHnswlibModule', lib);

declare global {
  export const testHnswlibModule: HnswlibModule;
}
