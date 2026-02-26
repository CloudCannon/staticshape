---
title: "HugoConf 2023 Talk"
nav_title: "HugoConf Talk"
nav_section: Root
weight: 3
---

Presented at [HugoConf 2023](https://hugoconf.io) by George Phillips from [CloudCannon](https://cloudcannon.com/), this talk demonstrates StaticShape migrating a real website to Hugo from scratch.

<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
<iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" src="https://www.youtube.com/embed/wlJkQEC2LNQ" title="Automated migration at scale: Migrate to Hugo from any existing site // HugoConf 2023" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

## Talk breakdown

### The migration problem

Migrating to a static site generator like Hugo gives you a more secure, more reliable, and more maintainable website. The issue is that the migration itself takes time — time you don't have because you're still maintaining your current site. StaticShape is designed to bridge that gap.

### Scraping a live site

The first step is downloading a live website into a local directory of static HTML and assets. The talk demonstrates this using [SiteScrape](https://github.com/CloudCannon/sitescrape) (`npx sitescrape`) on a Dunedin attractions website. The result is a folder of standalone HTML pages — each containing the full document with repeated `<head>`, navigation, and footer markup.

### Running StaticShape

With the static site downloaded, the next step is running StaticShape:

```bash
npx staticshape@latest
```

StaticShape prompts for the source directory, a [configuration file](/docs/configuration-file/), an output directory, and which SSG to export to. Choosing Hugo produces:

- `config.toml` — Hugo site configuration
- `layouts/` — shared templates with variables, loops, and conditionals
- `content/` — page files with YAML front matter
- `static/` — all non-HTML assets carried across

### How variable detection works

The talk walks through a simple example: two pages with different `<title>` tags. StaticShape compares the element nodes and finds the elements themselves are identical (`<title>`) but the text children differ ("Home" vs "About"). Since the text values don't match, the text node is replaced with a [variable node](/docs/variable-nodes/) and the differing values are extracted as data for each page.

The same process applies to meta tags, OG titles, canonical URLs, and any other text or attribute that varies between pages.

### How loop detection works

The Dunedin attractions site has a "more attractions" section at the bottom of each page — a set of nearly identical cards with different images, links, and text. StaticShape detects these repeated sibling elements using [equivalency scoring](/docs/comparing-nodes/), generating a score between 0 and 100 for each pair. Elements above the threshold are collapsed into a [loop node](/docs/loop-nodes/) with a shared template and per-item data.

The talk highlights a nested loop case: each attraction card contains a set of badges (e.g. "Beach", "Walk"). On one page there are three badges, on another just one. The single element is initially parsed as a plain element, but when merged with a page that has multiple badges (already detected as a loop), StaticShape recognizes the match and converts it into a loop as well — producing a loop within a loop.

### Configuration

The [configuration file](/docs/configuration-file/) is where you define which pages belong to which [collections](/docs/configuring-collections/) and where the [content boundaries](/docs/configuring-page-content/) are. The talk uses a config with two collections: general pages and attractions, each with a content selector to separate page content from the shared layout.

### Future directions

The talk closes with a roadmap of planned features:

- **Base templates** — merging collection layouts into a shared base template to reduce duplication across collections
- **Collection loops** — detecting that a loop on a page corresponds to a configured collection, then referencing the collection directly instead of inline data
- **CSS variable diffing** — extracting variables from `<style>` tags within components
- **XML support** — variables and loops inside XML documents
- **Script AST diffing** — using an AST parser to diff JavaScript and extract data arrays from `<script>` nodes
- **Auto markdown conversion** — automatically converting documentation content into markdown
- **Page builder output** — converting marketing landing pages into live-editable page builder components for [CloudCannon](https://cloudcannon.com/)
