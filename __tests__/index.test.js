const { executionAsyncId } = require('async_hooks');
const crypto = require('crypto');
const fsMock = require('fs/promises');
const LRU_FS = require('../index');
const { calculateHash } = require('../utils');

jest.mock('fs/promises')

function createData(length) {
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').substr(0, length);
}

describe('LRU_FS', () => {
  const max = 10;
  const maxAge = 10000;
  const cache = new LRU_FS({
    max,
    maxAge,
    rootFolder: '.',
  });

  afterEach(() => {
    cache.reset();
    fsMock.reset();
  });

  describe('init', () => {
    it('should run without any problem when no files are present', async () => {
      await cache.init();
      expect(cache.length).toBe(0);
      expect(cache.itemCount).toBe(0);
    });

    it('should initialize with values from fs', async () => {
      const now = new Date();
      const mockFiles = {
        file1: {
          data: createData((max / 3) - 1),
          birthtime: now,
        },
        file2: {
          data: createData((max / 3) - 1),
          birthtime: now - 1000,
        },
        file3: {
          data: createData((max / 3) - 1),
          birthtime: now - 2000,
        },
      };
      fsMock.injectValues(mockFiles);
      await cache.init();
      const expectedFiles = Object.values(mockFiles);
      expect(cache.length).toBe(expectedFiles.reduce((res, {data: {length}}) => res + length, 0));
      expect(cache.itemCount).toBe(expectedFiles.length);
      expect(fsMock.stat.mock.calls.length).toBe(expectedFiles.length);
    });

    it('should keep the latest files, and delete the oldest one', async () => {
      const now = new Date();
      const mockFiles = {
        file1: {
          data: createData(max / 2),
          birthtime: now,
        },
        file2: {
          data: createData(max / 2),
          birthtime: now - 1000,
        },
        file3: {
          data: createData(max / 2),
          birthtime: now - 2000,
        },
      };
      fsMock.injectValues(mockFiles);
      await cache.init();
      const expectedFiles = Object.values(mockFiles).slice(0, 2);
      expect(cache.length).toBe(expectedFiles.reduce((res, {data: {length}}) => res + length, 0));
      expect(cache.itemCount).toBe(expectedFiles.length);
      expect(fsMock.unlink.mock.calls.length).toBe(1);
      expect(fsMock.unlink.mock.calls[0]).toEqual(['file3']);
    });

    it('should delete files that are too old to enter the cache', async () => {
      const now = new Date();
      const mockFiles = {
        file1: {
          data: createData(max / 4),
          birthtime: now,
        },
        file2: {
          data: createData(max / 4),
          birthtime: now - 1000,
        },
        file3: {
          data: createData(max / 4),
          birthtime: now - 2000,
        },
        file4: {
          data: createData(max / 4),
          birthtime: now - maxAge - 1000,
        }
      };
      fsMock.injectValues(mockFiles);
      await cache.init();
      const expectedFiles = Object.values(mockFiles).slice(0, 3);
      expect(cache.length).toBe(expectedFiles.reduce((res, {data: {length}}) => res + length, 0));
      expect(cache.itemCount).toBe(expectedFiles.length);
      expect(fsMock.unlink.mock.calls.length).toBe(1);
      expect(fsMock.unlink.mock.calls[0]).toEqual(['file4']);
    });
  });

  describe('set', () => {
    it('should write to file system when added to cache', async () => {
      const key = 'file';
      const data = createData(max / 2);
      const res = await cache.set(key, data);
      expect(res).toBe(true);
      expect(fsMock.writeFile.mock.calls.length).toBe(1);
      expect(fsMock.writeFile.mock.calls[0]).toEqual([calculateHash(key), data]);
    });

    it('should remove from file system the old value when new value exceeds remaining size', async () => {
      const key1 = 'file1';
      await cache.set(key1, createData(max / 2));
      await cache.set('file2', createData(2 + (max / 2)));
      expect(fsMock.writeFile.mock.calls.length).toBe(2);
      expect(fsMock.unlink.mock.calls.length).toBe(1);
      expect(fsMock.unlink.mock.calls[0]).toEqual([calculateHash(key1)]);
    });

    it('should not write anything if new data exceeds total max size', async () => {
      const res = await cache.set('file', createData(max + 1));
      expect(res).toBe(false);
      expect(fsMock.writeFile.mock.calls.length).toBe(0);
    });
  });

  describe('get', () => {
    it('should read data from file system', async () => {
      const key = 'file';
      const data = createData(max / 2);
      await cache.set(key, data);
      const actual = await cache.get(key);
      expect(actual).toBe(data);
      expect(fsMock.readFile.mock.calls.length).toBe(1);
      expect(fsMock.readFile.mock.calls[0]).toEqual([calculateHash(key)]);
    });

    it('should not access the file system if key is not in cache', async () => {
      const res = await cache.get('file');
      expect(res).toBe(undefined);
      expect(fsMock.readFile.mock.calls.length).toBe(0);
    });
  });
});
