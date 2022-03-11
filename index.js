const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const glob = require('glob-contents');
const frontmatter = require('front-matter');
const nunjucks = require('nunjucks');
const { Feed } = require('feed');
const md = require('markdown-it')();

module.exports = async function main(options) {

  const {
    output = '_site/',
    input = 'posts/',
    rss = 'feed',
    template: postTemplate = 'templates/post.njk',
  } = options || {};

  const indir = path.resolve(__dirname, input);
  const outdir = path.resolve(__dirname, output);

  const rssJson = `${rss}.json`
  const rssXml = `${rss}.xml`;
  const feed = await fs.readFile(path.resolve(__dirname, rssJson), 'utf8')
    .then((json) =>  new Feed(JSON.parse(json)));

  function render(...args) {
    console.log(args);
    return new Promise((resolve, reject) => {
      nunjucks.render(...args, (err, data) => err ? reject(err) : resolve(data))
    });
  }

  function byDate(a, b) {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    return bTime - aTime;
  }

  function process([ filepath, contents ]) {
    const { name, dir } = path.parse(filepath);
    const rel = path.relative(__dirname, dir);
    const newpath = path.join(rel, name);
    const link = new URL(newpath, feed.options.link).toString();
    const id = crypto.createHash('md5').update(link).digest('hex');
    
    const { attributes, body } = frontmatter(contents);
    const html = md.render(body);
    const { template, ...fm } = attributes;

    const target = path.resolve(__dirname, template || postTemplate)
    
    return render(target, { html, fm })
      .then((page) => fs.outputFile(path.join(outdir, newpath, 'index.html'), page))
      .then(() => ({ link, id, content: body, ...fm }));
  }

  glob(path.join(indir, '*.md'))
    .then((res) => Promise.all(Object.entries(res).map(process)))
    .then((items) => items.sort(byDate).forEach((item) => feed.addItem(item)))
    .then(() => fs.outputFile(path.join(outdir, rssXml), feed.rss2()))
}







