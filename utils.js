const crypto = require('crypto');

function calculateHash(key) {
  const hash = crypto.createHash('sha256');
  hash.update(key);
  return hash.digest('hex');
}

module.exports = {
  calculateHash,
};
