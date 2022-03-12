# upwrite
[![npm version](https://img.shields.io/npm/v/upwrite.svg)](https://www.npmjs.com/package/upwrite)

Configuring a blog is annoying, let's do better.

- Maintains folder structure of files for posts
- Uses [`markdown-it`] to transform Markdown into HTML (`md.html` in templates).
- Pipes [`front-matter`] to [`nunjucks`] templates under `fm` key (`md.fm.title`).
- Setup [`front-matter`] for RSS feed metadata.
- Write RSS feed from posts using [`feed`].
- Write `sitemap.txt` from contents.

## Install

```sh
npm i upwrite
```

## Usage

Assuming you've completed the [setup](#setup), using the CLI:

```sh
upwrite [options]
```

Or using the API:

```js
const upwrite = require('upwrite');

upwrite(options).then(done).catch(err);
```

## Options

| Key | CLI shortcut | Default | Description |
| --- | ------------ | ------- | ----------- |
| `input` | `-i` | `posts/` | Directory where your content to be transformed exists. [More](#posts) |
| `output` | `-o` | `_site` | Directory where the final output should be written. [More](#output) |
| `rss` | `-r` | `feed.json` | The `.json` file which informs the RSS feed. [More](#feedjson) |
| `template` | `-t` | `templates/post.njk` | The [`nunjucks`] template to use for the transformation. [More](#Templates) |
| `copy` | `-c` | `true` | Copies non-markdown files into the `output` directory in the same structure. [More](#non-markdown-files) |

CLI options example:

```sh
upwrite -i blog -o public -r rss.json -t nunjucks/blog.html
```

- Looks at the `blog/` directory for files.
- Outputs to the `public/` directory; creating `public/blog/`
- References the `rss.json` file to initialize the feed. Writes `public/rss.xml`
- Uses template found at `nunjucks/blog.html`
## Setup

```text
📁 ./
├── 📁 _site
├── 📁 posts
├── 📁 templates
└── 📄 feed.json
```

- The `_site/` directory *will be created* during `upwrite` execution.
- The `posts/` directory holds `.md` files with [`front-matter`].
- The `templates/` directory holds `.njk` files for use with [`nunjucks`].
- The `feed.json` file has initial feed information.

### Posts

Each post is a `.md` file with [`front-matter`] at the top with metadata expected to populate the RSS feed. The metadata is piped into the `addItem()` method of the [`feed`] project. The following keys are required for each post.

```md
---
title: My first post
description: And I think you all should read it
date: 2013-12-29 17:16:55
---
```

You may include a special `template` key to override the base template for specific posts.

```md
---
title: My second post
description: You should all still read it
date: 2022-03-11 07:16:55
template: templates/no-date.njk
---
```

### Templates

The templates are transformed using [`nunjucks`]. Much of the data collected through processing is found on a `md` key within the file. You'll commonly have the following basic template setup:

```html
<!doctype>
<html>
  <head>
    <!-- Any metadata found in the front-matter is at `md.fm` -->
    <title>{{ md.fm.title }}</title>
    <meta name="description" content="{{ md.fm.description }}">
  </head>
  <body>
    <datetime>{{ md.fm.date }}</datetime>
    <!-- Use the "safe" filter in Nunjucks to render `md.html` as html -->
    <main>{{ md.html | safe }}</main>
  </body>
</html>
```

### `feed.json`

This `.json` file is the starting point to create the RSS feed. It has the following required fields:

```json
{
  "title": "The best blog",
  "description": "The one and only",
  "link": "https://example.com"
}
```

The `link` field is *escpecially required* as it's used to construct post urls alongside the file structure of your project. The name of this file (`feed`) is used to name the resulting `.xml` file of the feed (`feed.xml`) and can be changed in the [options](#options).

## Output

```text
📁 ./
└── 📁 _site
    ├── 📄 feed.xml
    ├── 📄 sitemap.txt
    └── 📁 posts
        └── 📁 [markdown-filename]
            └── 📄 index.html
```

- The `feed.xml` file is your RSS feed based on [`feed.json`](#feedjson) and the `.md` files found in the `posts/` directory.
- The `sitemap.txt` is a list of all the urls processed by the transformer, used as a sitemap.
- The `posts/` directory in `_site/` will maintain the same structure of the source `.md` files but write `index.html` files instead of `[markdown-filename].html`. This allows for clean urls.

```diff
- https://example.com/posts/first-post.html
+ https://example.com/posts/first-post

- https://example.com/posts/nested/third-post.html
+ https://example.com/posts/nested/third-post
```

### Non-markdown files
All files found within the `input` directory that are not `.md` will be copied to the new directory using the same structure they were found with.

```diff
- ./posts/nested/media.jpg
+ ./_site/posts/nested/media.jpg
```

You can skip this by setting `copy` to `false`.

[`markdown-it`]: https://www.npmjs.com/package/markdown-it
[`front-matter`]: https://www.npmjs.com/package/front-matter
[`nunjucks`]: https://www.npmjs.com/package/nunjucks
[`feed`]: https://www.npmjs.com/package/feed