const fs = jest.createMockFromModule('fs/promises');

const files = new Map();

async function writeFile(path, data) {
  return files.set(path, { data, birthtime: new Date() });
}

async function readFile(path) {
  const { data } = files.get(path);
  return data;
}

async function unlink(path) {
  return files.delete(path);
}

async function readdir(path) {
  return [...files.keys()];
}

async function stat(path) {
  const { data, birthtime } = files.get(path);
  return { size: data.length, birthtime };
}

function reset() {
  files.clear();
}

function injectValues(data) {
  Object.entries(data).forEach(([path, {data, birthtime }]) => {
    files.set(path, { data, birthtime });
  });
}

fs.writeFile = jest.fn(writeFile);
fs.readFile = jest.fn(readFile);
fs.unlink = jest.fn(unlink);
fs.readdir = jest.fn(readdir);
fs.stat = jest.fn(stat);
fs.reset = reset;
fs.injectValues = injectValues;

module.exports = fs;
