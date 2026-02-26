---
title: "Exporting to 11ty"
nav_title: "Exporting to 11ty"
nav_section: Exporting to an SSG
weight: 952
---

The [11ty](https://www.11ty.dev/) export engine is not yet implemented. StaticShape's CLI lists 11ty as an option, but selecting it will produce an error.

## What this engine would produce

An 11ty export engine would generate the same [four categories of output](/docs/export-engines/) as other engines, using Nunjucks or Liquid templates:

- **Static files** in a configured passthrough directory
- **Layout templates** using Nunjucks syntax (e.g. `{{ variable }}`, `{% for %}`, `{% if %}`)
- **Content files** with YAML front matter
- **11ty config** (`.eleventy.js` or `eleventy.config.js`)

## Contributing

This engine is open for contributions. See the [GitHub repository](https://github.com/cloudcannon/staticshape) to get involved. The [Hugo export engine](/docs/hugo-export-engines/) serves as a reference implementation.
