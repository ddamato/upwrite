const { expect } = require('chai');
const upwrite = require('../');
const path = require('path');
const fs = require('fs-extra');

const fixtures = path.join(__dirname, 'fixtures');

function allFilesExist(files) {
  return Promise.all(files.map((file) => fs.pathExists(file)))
    .then((bools) => bools.every(Boolean));
}

describe('upwrite', function () {
  it('should export a function', function () {
    expect(upwrite).to.be.a('function');
  });

  it('should process files', async function () {
    
    const options = {
      rss: path.join(fixtures, 'feed.json'),
      input: 'website/',
      output: '_output/',
      template: 'views/post.njk',
    };

    await upwrite(options);

    const files = [
      path.join(fixtures, options.output, 'feed.xml'),
      path.join(fixtures, options.output, 'sitemap.txt'),
      path.join(fixtures, options.output, options.input, 'media.txt'),
      path.join(fixtures, options.output, options.input, 'posts', 'video.txt')
    ];
    expect(await allFilesExist(files)).to.be.true;
  });
});