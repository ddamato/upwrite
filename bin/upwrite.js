#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();
const { version } = require('../package.json');
const upwrite = require('../');

program
  .version(version, '-v, --version')
  .option('-i, --input <string>', 'Path to markdown files', 'posts/')
  .option('-o, --output <string>', 'Directory for the output', '_site/')
  .option('-r, --rss <string>', 'Path to the rss configuration JSON file', 'feed.json')
  .option('-t, --template <string>', 'Path of the Nunjucks template to use', 'templates/post.njk')
  .parse();

upwrite(program.opts())
  .then(() => console.info('upwritten'))
  .catch((err) => console.error(err));
