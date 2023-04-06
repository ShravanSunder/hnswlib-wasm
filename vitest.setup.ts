import { EsbuildPhoenix } from '@xn-sakina/phoenix'
import { vi } from 'vitest'
import  fakeIndexedDB  from 'fake-indexeddb'

// Implemented esbuild hook require() to support import `.ts` files
// new EsbuildPhoenix({
//   target: 'es2019'
// })

const mock = vi.fn(() => { });

vi.stubGlobal('indexedDB', fakeIndexedDB);

export async function setup() {
}
