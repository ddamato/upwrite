const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const glob = require('glob-contents');
const frontmatter = require('front-matter');
const nunjucks = require('nunjucks');
const { Feed } = require('feed');
const md = require('markdown-it')();
const cwd = process.cwd();

function getFeed(name) {
  return fs.readFile(path.resolve(cwd, `${name}.json`), 'utf8')
    .then((json) => new Feed(JSON.parse(json)));
}

function byDate(a, b) {
  const aTime = new Date(a.date).getTime();
  const bTime = new Date(b.date).getTime();
  return bTime - aTime;
}

function render(...args) {
  return new Promise((resolve, reject) => {
    nunjucks.render(...args, (err, data) => err ? reject(err) : resolve(data))
  });
}

module.exports = async function main(options) {

  const {
    output = '_site/',
    input = 'posts/',
    rss = 'feed',
    template: postTemplate = 'templates/post.njk',
  } = options || {};

  const indir = path.resolve(cwd, input);
  const outdir = path.resolve(cwd, output);

  const feed = await getFeed(rss);

  function metadata(filepath) {
    const { name, dir } = path.parse(filepath);
    const pathname = path.join(path.relative(cwd, dir), name);
    const link = new URL(pathname, feed.options.link).toString();
    const id = crypto.createHash('md5').update(link).digest('hex');
    return { link, id };
  }

  function context(contents) {
    const { attributes, body } = frontmatter(contents);
    const { template, ...fm } = attributes;
    return {
      name: path.resolve(cwd, template || postTemplate),
      data: { html: md.render(body), fm }
    }
  }

  function process([ filepath, contents ]) {
    // Metadata for the RSS feed, (url, guid)
    const meta = metadata(filepath);
    // Data for Nunjucks render
    const { name, data } = context(contents);
    // Reconstruct path to url
    const { pathname } = new URL(meta.link);
    
    // Nunjucks render promise
    return render(name, data)
      // Write Nunjucks output as {input...}/index.html
      .then((page) => fs.outputFile(path.join(outdir, pathname, 'index.html'), page))
      // Return data for RSS item
      .then(() => ({ content: data.html, fm: data.fm, ...meta }));
  }

  // Find all .md files in input dir
  return glob(path.join(indir, '*.md'))
    // Process all the files
    .then((res) => Promise.all(Object.entries(res).map(process)))
    // Sort for returning data for RSS items
    .then((items) => items.sort(byDate).forEach((item) => feed.addItem(item)))
    // Write the RSS feed
    .then(() => fs.outputFile(path.join(outdir, `${rss}.xml`), feed.rss2()))
}
