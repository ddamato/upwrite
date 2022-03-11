const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const glob = require('glob-contents');
const jsYaml = require('js-yaml');
const { Environment, FileSystemLoader } = require('nunjucks');
const RSS = require('rss');
const md = require('markdown-it')();

const fmRgx = /^(-{3}(?:\n|\r)(?<frontmatter>[\w\W]+?)(?:\n|\r)-{3})?(?<markdown>[\w\W]*)*/;

module.exports = async function main(options) {

  const {
    output = '_site/',
    input = 'posts/',
    rss = 'feed',
    templates = 'templates/'
  } = options;

  const rssFile = `${rss}.xml`;
  const rssConfig = fs.readFile(`${rss}.yml`, 'utf8').then((res) => jsYaml.safeLoad(res));

  function populate(config) {
    const { site_url = base } = config;
    return {
      ...config,
      site_url,
      feed_url: new URL(rssFile, site_url),
      pubDate: new Date().toUTCString(),
    }
  }

  const config = populate(rssConfig);
  const feed = new RSS(config);
  const compiler = new Environment(new FileSystemLoader(templates));
  const outdir = path.resolve(__dirname, output);

  function render(...args) {
    return new Promise((resolve, reject) => {
      compiler.renderString(...args, (err, data) => err ? reject(err) : resolve(data))
    });
  }

  function process([ filepath, contents ]) {
    const { name } = path.parse(filepath);
    const dir = path.relative(input, filepath);
    const newpath = path.resolve(dir, `${name}.html`);
    const { groups } = fmRgx.exec(contents) || {};
    const { frontmatter, markdown } = groups || {};
    const fm = jsYaml.safeLoad(frontmatter);
    const html = md.render(markdown);
    const url = new URL(newpath, config.site_url);
    const guid = crypto.createHash('md5').update(url).digest('hex');
    feed.item({ url, guid, ...fm });
    return render(html, fm).then((page) => fs.outputFile(path.join(outdir, newpath), page));
  }

  await glob(input).then((res) => Promise.all(Object.entries(res).map(process)));
  await fs.outputFile(path.join(outdir, rssFile), feed.xml());
}







