const path = require('path');
const fs = require('fs-extra');
const { expect } = require('chai');
const upwrite = require('../');

describe('upwrite', function () {
  it('should export as function', function () {
    expect(upwrite).to.be.a('function');
  });

  it('should process files from cwd', async function () {
    await upwrite();
    const output =  path.resolve(__dirname, '..', '_site');
    const files = [
      path.join(output, 'feed.xml'),
      path.join(output, 'posts', 'first-post', 'index.html'),
      path.join(output, 'posts', 'second-post', 'index.html')
    ];
    const exists = await Promise.all(files.map((p) => fs.pathExists(p)));
    expect(exists.every(Boolean)).to.be.true;
  });
});
