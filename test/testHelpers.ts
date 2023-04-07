import { IdbfsFileStore } from '../dist/hnswlib';

export const testErrors = {
  indexSize: /The maximum number of elements has been reached in index/,
  vectorSize: /Invalid vector size. Must be equal to the dimension of the space./,
  vectorArgument: /Cannot convert .* to float/,

  unsignedIntArgument: /Cannot convert .* to unsigned int/,

  arugmentCount: /called with .* arguments, expected .* args!/,

  stringArgument: /Cannot pass non-string to std::string/,

  indexNotInitalized: /Search index has not been initialized, call `initIndex` in advance/,

  isNotFunction: /is not a function/,
};

export type testErrorTypes = keyof typeof testErrors;

export const adaDimensions = 1536 as const;
export const createVectorData = (numOfVec = 100, dimensions: number = adaDimensions) => {
  const vectors: Float32Array[] = [];
  const labels: number[] = [];

  for (let i = 0; i < numOfVec; i++) {
    const vector = Array.from({ length: dimensions }, () => Math.random());
    vectors.push(new Float32Array(vector));
    labels.push(i);
  }

  return { vectors, labels };
};

export type IdbFileData = {
  timestamp: number;
  mode: string;
  contents: Uint8Array;
};

export const getIdbFileList = async (request: IDBOpenDBRequest): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const db: IDBDatabase = request.result;
      console.log('stores', db.objectStoreNames);
      const transaction = db.transaction(IdbfsFileStore, 'readonly');
      const fileDataStore = transaction.objectStore(IdbfsFileStore);

      const fileList: string[] = [];
      const cursorRequest = fileDataStore.openCursor();

      cursorRequest.onsuccess = (event: Event) => {
        const cursor: IDBCursorWithValue | null = (event.target as IDBRequest).result;
        if (cursor) {
          fileList.push(cursor.key.toString());
          cursor.continue();
        } else {
          resolve(fileList);
        }
      };

      cursorRequest.onerror = (event: Event) => {
        reject(new Error('Error while retrieving file list from IDBFS.'));
      };
    };

    request.onerror = (event: Event) => {
      reject(new Error('Error while opening IndexedDB.'));
    };
  });
};
