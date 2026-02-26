---
title: "Exporting to an SSG"
nav_title: "Export engines"
nav_section: Exporting to an SSG
weight: 950
---

An export engine takes the AST and data produced by StaticShape's [diffing phase](/docs/comparing-trees/) and renders it into the files needed for a specific static site generator. Each engine translates the same intermediate representation into a different templating language and folder structure.

## What an engine produces

Every export engine generates four categories of output:

### Static files

All non-HTML files from the source site (images, CSS, fonts, etc.) are copied into the engine's static assets directory. The directory name varies by SSG — for example, Hugo uses `static/`.

### Layout templates

Each collection gets a layout file containing the shared HTML structure with SSG-specific templating syntax. The AST nodes are rendered into the target language:

- [Variable nodes](/docs/variable-nodes/) become template variable tags
- [Loop nodes](/docs/loop-nodes/) become iteration blocks
- [Conditional nodes](/docs/conditional-nodes/) become conditional blocks
- [Markdown variables](/docs/variable-nodes/#markdown-variable) are piped through a markdown filter
- [Content nodes](/docs/content-node/) become the SSG's content insertion tag

### Content files

Each page in a collection produces a content file with:

- **Front matter** (YAML) containing all extracted data for that page
- **Rendered content** from the page's content section, if one was [configured](/docs/configuring-page-content/)

### Config files

The engine generates an SSG configuration file (e.g. `hugo.yaml`) and a [CloudCannon configuration file](https://cloudcannon.com/documentation/articles/setting-global-configuration/) for CMS integration.

## Engine interface

Each export engine implements five methods:

| Method | Purpose |
|---|---|
| `staticDirectory()` | Returns the path where static assets should be placed |
| `engineConfig()` | Generates the SSG config file |
| `cloudCannonConfig()` | Generates the CloudCannon config file |
| `exportLayout()` | Renders a collection's AST layout into a template file |
| `exportCollectionItem()` | Renders a page's data and content into a content file |

## Supported engines

| SSG | Status |
|---|---|
| [Hugo](/docs/hugo-export-engines/) | Implemented |
| [11ty](/docs/11ty-export-engines/) | Planned |
| [Astro](/docs/astro-export-engines/) | Planned |
| [Jekyll](/docs/jekyll-export-engines/) | Planned |
