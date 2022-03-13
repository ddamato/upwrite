const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const glob = require('fast-glob');
const frontmatter = require('front-matter');
const nunjucks = require('nunjucks');
const { Feed } = require('feed');
const md = require('markdown-it')();
const cwd = process.cwd();

function getBase(filepath) {
  const { dir } = path.parse(filepath);
  return path.join(cwd, path.relative(cwd, dir));
}

function getEnv(tmpl, base) {
  const { dir } = path.parse(tmpl);
  return new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(base, dir)));
}

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
 * Gets the filepath for all files in directory
 * 
 * @param {String} dir - Directory to search
 * @returns {Array<Array>} - Tuple with the filepath and contents
 */
async function getFilePaths(dir) {
  const files = await glob(path.join(dir, '**/*'));
  return files.reduce((acc, file) => {
    acc[Number(path.parse(file).ext === '.md')].push(file);
    return acc;
  }, [[], []]);
}

/**
 * Gets contents of a file
 * 
 * @param {String} filepath - Path to file
 * @returns {Array<Array>} - Tuple with filepath and contents
 */
async function readFile(filepath) {
  const contents = await fs.readFile(filepath, 'utf8');
  return [ filepath, contents ]
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
    copy = true,
    input = 'posts/',
    output = '_site/',
    rss = 'feed.json',
    template: postTemplate = 'templates/post.njk',
  } = options || {};

  const base = getBase(rss);
  const indir = path.resolve(base, input);
  const outdir = path.resolve(base, output);
  const { name } = path.parse(rss);
  const feed = await getFeed(rss);
  const env = getEnv(postTemplate, base);

  /**
   * Creates metadata for feed item
   * 
   * @param {String} filepath - path to the current file
   * @returns {Object} - metadata about the file for feed item
   */
  function metadata(filepath) {
    const { name, dir } = path.parse(filepath);
    const pathname = path.join(path.relative(base, dir), name);
    const link = new URL(pathname, feed.options.link).toString();
    const id = crypto.createHash('md5').update(link).digest('hex');
    return { link, id, pathname };
  }

  /**
   * Copy non-markdown files
   * 
   * @param {String} filepath - Path to the file
   * @returns {Promise} - Resolves with file copied to new destination
   */
  function copyFiles(filepath) {
    const { ext } = path.parse(filepath);
    const { pathname } = metadata(filepath);
    return fs.copy(filepath, path.resolve(outdir, pathname + ext));
  }

  /**
   * Create context for Nunjucks rendering
   * 
   * @param {String} contents - file contents
   * @returns {Object} - name: template to use for rendering, data: sent to the renderer
   */
  function context(contents) {
    const { attributes, body } = frontmatter(contents);
    return { html: md.render(body), fm: attributes }
  }

  /**
   * Process each file
   * 
   * @param {Array} entry - A found item to be processed [filepath, contents]
   * @returns {Promise} - Nunjucks render / write file promise, resolving to feed items
   */
  function generate([ filepath, contents ]) {
    // Metadata for the RSS feed, (url, guid)
    const meta = metadata(filepath);
    // Data for Nunjucks render
    const ctx = context(contents.toString());

    return { ...meta, ...ctx };
  }

  async function dynamicTemplate(tmpl) {
    const contents = await fs.readFile(path.resolve(base, tmpl), 'utf8');
    const { body, attributes } = frontmatter(contents.toString());
    Object.entries(attributes).forEach(([filter, fn]) => {
      const exec = Function(`return ${fn}`)();
      if (typeof exec === 'function') env.addFilter(filter, exec);
    });
    return new nunjucks.Template(body, env, tmpl);
  }

  // Get all filepaths, partition by markdown
  const [ rest, markdown ] = await getFilePaths(indir);

  // Read contents of markdown files
  const posts = await Promise.all(markdown.map(readFile))
    // Generate data
    .then((contents) => Promise.all(contents.map(generate)));
  
  // Write Nunjucks files
  await Promise.all(posts.map(async (post) => {
    const data = {
      post,
      posts,
      page: feed.options,
    };
    const tmpl = await dynamicTemplate(post.fm.template || postTemplate);
    return fs.outputFile(path.join(outdir, post.pathname, 'index.html'), tmpl.render(data));
  }));
  
  const items = posts.map((post) => {
    return { content: post.html, link: post.link, id: post.id, ...post.fm, };
  });

  // Prepare items for RSS feed
  items.filter(({ date }) => date).sort(byDate).map((item) => feed.addItem(item));
  
  // Write the feed
  await fs.outputFile(path.join(outdir, `${name}.xml`), feed.rss2());

  // Write the sitemap
  const sitemap = [feed.options].concat(items).map(({ link }) => link).join('\n');
  await fs.outputFile(path.join(outdir, 'sitemap.txt'), sitemap);

  // Copy non-markdown files to new directory structure
  if (copy) await Promise.all(rest.map(copyFiles));
}
