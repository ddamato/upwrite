const { expect } = require('chai');
const upwrite = require('../');

describe('upwrite', function () {
  it('should export as function', function () {
    expect(upwrite).to.be.a('function');
  });

  it('should process files from cwd', async function () {
    await upwrite();
  })
});
