# lru-fs

Just a simple wrapper around [lru-cache](https://www.npmjs.com/package/lru-cache), that persists the cached data as into the file system.

## Usage:
```javascript
const LRU-FS = require("lru-fs");
const options = {
  max: 10 * 1024 * 1024, // 10Mb - max size (in bytes) of all files kept in the cache/file system
  maxAge: 60 * 1000, // 1hr - max time to keep each file in the cache/file system
  rootFolder: '.cache', // path to file system location where the cache should keep all files, defaults to '.'
};

await cache.init(); // reads all current files in the cache folder
                    // and puts them in the cache while using their birthtime
                    // to decide if they should already be evicted

const added = await cache.set("key", "some very long text/data you want to keep as a file, instead of all in-memory");
// returns true if item was added. false if it is too big for the cache

const value = await cache.get("key");
// "some very long text/data you want to keep as a file, instead of all in-memory"

await cache.reset()    // emptys the cache and deletes all the local files
```

The `length` and `dispose` options from LRU-CACHE are ignored.

## Options

* `rootFolder` path to file system location where the cache should keep all files, defaults to '.'
* ~~`length`~~ the length option from LRU-CACHE was removed, in order to automatically calculate the length of all files in the cache
* ~~`dispose`~~ the dispose option from LRU-CACHE was removed, in order to delete the files from the file system, once an item is being evicted from the cache
