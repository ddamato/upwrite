#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();
const pkg = require('../package.json');
const upwrite = require('../');

program
  .version(pkg.version, '-v, --version')
  .option('-i, --input', 'Path to markdown files', 'posts/')
  .option('-o, --output', 'Directory for the output', '_site/')
  .option('-r, --rss', 'Path to the rss configuration JSON file', 'feed.json')
  .option('-t, --template', 'Path of the Nunjucks template to use', 'templates/post.njk')
  .parse();

upwrite(program.opts())
  .then(() => console.info('upwritten'))
  .catch((err) => console.error(err));
