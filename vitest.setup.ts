// import { EsbuildPhoenix } from '@xn-sakina/phoenix'
import { vi } from 'vitest'
import  fakeIndexedDB  from 'fake-indexeddb'


vi.stubGlobal('indexedDB', fakeIndexedDB);

// export async function setup() {
// }

export async function teardown() {
  process.stdout.write("");
}