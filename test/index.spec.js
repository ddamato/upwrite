const { expect } = require('chai');
const upwrite = require('../');

describe('upwrite', function () {
  it('should export a function', function () {
    expect(upwrite).to.be.a('function');
  });

  it('should process files', async function () {
    await upwrite({
      rss: 'test/fixtures/feed.json',
      input: 'posts/',
      output: '_output/',
      template: 'template.njk',
    });
  });
});