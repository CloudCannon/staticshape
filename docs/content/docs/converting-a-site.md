---
title: "Converting a site"
nav_title: "Converting a site"
nav_section: How it works
weight: 2
---

StaticShape takes a folder and converts it to an SSG site. This means that:

1. All of the HTML pages are converted into data/content
2. That data are logically grouped into "collections"
2. Within each collection the pages are compared to generate a shared layout with variables, conditionals and loops
3. The static files are all moved across

All of this is generated into an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) so that it can be [exported](/docs/export-engines/) into a variety of different static site generators. This includes the SSG configuration, the folder structure and specific templating langugages.

## Collections

A Collection is a general SSG term used to define a group of files. A collections could be:

- Pages, e.g. general pages, landing pages
- People, e.g. staff members, authors, contributors
- News, e.g. blogs, articles, press releases
- Items, e.g. products, collectables, books

Knowing what pages are part of which collection on your site is out of scope for StaticShape. To bridge the gap, this is configured using an external JSON file. This configuration tells StaticShape which files are part of each collection and what element holds the page `content`.

Once StaticShape has all of the correct files to parse, it can get to work on reading each file and comparing each to produce the data and shared layout.

## Exporting

With the collection files and layouts, all thats left is to list the static files. Once that's done, this can all be passed to the export engine. This outputs each file and voilà, we have our SSG site.

There is plenty to dig into in parsing the collections which will be the focus of the rest of the docs.