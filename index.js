const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const glob = require('glob-contents');
const frontmatter = require('front-matter');
const nunjucks = require('nunjucks');
const { Feed } = require('feed');
const md = require('markdown-it')();
const cwd = process.cwd();

/**
 * Create a feed instance from .json config
 * 
 * @param {String} name - filename for the feed
 * @returns {Promise} - a new Feed instance
 */
function getFeed(filepath) {
  return fs.readFile(path.resolve(cwd, filepath), 'utf8')
    .then((json) => new Feed(JSON.parse(json)));
}

/**
 * Sort objects by date key
 * 
 * @param {Object} a - First comparison data
 * @param {Object} b - Second comparison data
 * @returns {Number} - Comparison for sorting
 */
function byDate(a, b) {
  const aTime = new Date(a.date).getTime();
  const bTime = new Date(b.date).getTime();
  return bTime - aTime;
}

/**
 * Creates a Nunjucks render promise
 * 
 * @param  {...any} args - Pass through arguments
 * @returns {Promise} - Nunjucks render promise
 */
function render(...args) {
  return new Promise((resolve, reject) => {
    nunjucks.render(...args, (err, data) => err ? reject(err) : resolve(data))
  });
}

/**
 * 
 * @param {Object} options - Configuration options
 * @param {String} options.input - Directory where to find .md files
 * @param {String} options.output - Directory to write files for public site
 * @param {String} options.rss - File name of the .json configuration for the feed, used to name the resulting .xml file.
 * @param {String} options.template - The base Nunjucks template to render with. Can be overridden with front-matter.
 * @returns {Promise} - Resolves to files
 *  [options.output]/[options.input]/md-file-name/index.html
 *  [options.output]/[options.rss].xml
 */
module.exports = async function upwrite(options) {

  const {
    input = 'posts/',
    output = '_site/',
    rss = 'feed.json',
    template: postTemplate = 'templates/post.njk',
  } = options || {};

  const indir = path.resolve(cwd, input);
  const outdir = path.resolve(cwd, output);
  const { name } = path.parse(rss);

  const feed = await getFeed(rss);

  /**
   * Creates metadata for feed item
   * 
   * @param {String} filepath - path to the current file
   * @returns {Object} - metadata about the file for feed item
   */
  function metadata(filepath) {
    const { name, dir } = path.parse(filepath);
    const pathname = path.join(path.relative(cwd, dir), name);
    const link = new URL(pathname, feed.options.link).toString();
    const id = crypto.createHash('md5').update(link).digest('hex');
    return { link, id };
  }

  /**
   * Create context for Nunjucks rendering
   * 
   * @param {String} contents - file contents
   * @returns {Object} - name: template to use for rendering, data: sent to the renderer
   */
  function context(contents) {
    const { attributes, body } = frontmatter(contents);
    const { template, ...fm } = attributes;
    return {
      name: path.resolve(cwd, template || postTemplate),
      data: { html: md.render(body), fm }
    }
  }

  /**
   * Process each file
   * 
   * @param {Array} entry - A found item to be processed [filepath, contents]
   * @returns {Promise} - Nunjucks render / write file promise, resolving to feed items
   */
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
      .then(() => ({ content: data.html, ...data.fm, ...meta }));
  }

  // Find all .md files in input dir
  return glob(path.join(indir, '*.md'))
    // Process all the files
    .then((res) => Promise.all(Object.entries(res).map(process)))
    // Sort for returning data for RSS items
    .then((items) => items.sort(byDate).forEach((item) => feed.addItem(item)))
    // Write the RSS feed
    .then(() => fs.outputFile(path.join(outdir, `${name}.xml`), feed.rss2()))
}
