const fs = require('fs/promises');
const { join } = require('path');

const LRU = require('lru-cache');

const { calculateHash } = require('./utils');

class LRU_FS extends LRU {
  #rootFolder;

  constructor(options = {}) {
    super({
      ...options,
      length: (item) => {
        const { length } = item;
        return length;
      },
      dispose: async (key, value) => {
        const { path } = value;
        try {
          if (typeof options.dispose === 'function') {
            options.dispose(key, value);
          }

          await fs.unlink(path);
        } catch (error) {
          console.error(`Failed deleting file for key ${key} at path ${path}`);
        }
      },
    });
    this.#rootFolder = options.rootFolder || '.cache';
  }

  async init() {
    const now = new Date();
    const files = await fs.readdir(this.#rootFolder);
    const fileStats = await Promise.all(files.map(async (file) => {
      const path = join(this.#rootFolder, file);
      const {birthtime, size}  = await fs.stat(path);
      return {file, path, birthtime, size};
    }));
    fileStats.sort(({birthtime: bt1}, {birthtime: bt2}) => {
      return bt1 - bt2;
    });
    await Promise.all(fileStats.map(async ({ file, path, birthtime, size }) => {
      const timeSinceBirth = now - birthtime;
      const timeUntilDispose = super.maxAge - timeSinceBirth;
      if (timeUntilDispose > 0) {
        super.set(file, {
          path,
          length: size,
        }, timeUntilDispose);
      } else {
        await fs.unlink(path);
      }
    }));
  }

  async set(key, value, maxAge) {
    const hashKey = calculateHash(key);
    const path = join(this.#rootFolder, hashKey);
    const length = value.length;
    if (!super.set(hashKey, { path, length }, maxAge)) {
      return false;
    }

    try {
      await fs.writeFile(path, value);
      return true;
    } catch (error) {
      super.del(hashKey);
      throw error;
    }
  }

  async get(key) {
    const hashKey = calculateHash(key);
    const value = super.get(hashKey);
    if (!value) {
      return value;
    }

    const { path } = value;
    try {
      return await fs.readFile(path);
    } catch (error) {
      super.del(hashKey);
      return undefined;
    }
  }
}

module.exports = LRU_FS;
