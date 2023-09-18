---
title: "Converting a site"
nav_title: "Converting a site"
nav_section: How it works
weight: 20
---

StaticShape takes a folder and converts it to an SSG site. This means that:

1. All of the HTML pages are converted into data/content
2. That data are logically grouped into "collections"
2. Within each collection the pages are compared to generate a shared layout with variables, conditionals and loops
3. The static assets are all moved across

All of this is generated into an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) so that it can be [exported](/docs/export-engines/) into a variety of different static site generators. This includes the SSG configuration, the folder structure and specific templating langugages.

## Shaping the site

StaticShape begins the process by reading the configuration file. This allows each collection to be processed separately:

1. The files are organized into their collections
2. Each file has the content and layout separated and parsed into a set of basic nodes
3. The layout trees are compared against each other to add loops, conditionals, and variables. In doing so the data is produced for each page.
4. The content is processed into its configured content type (markdown, html or components)

Each collection is now organized into data, layouts and content.

## Exporting

With the collection files and layouts, all that's left is to list the static files. Once that's done, this can all be passed to the export engine. This outputs each file and voilà, we have our SSG site.

There is plenty to dig into in parsing the collections — this will be the focus of the rest of the docs.
