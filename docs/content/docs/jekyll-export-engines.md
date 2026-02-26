---
title: "Exporting to Jekyll"
nav_title: "Exporting to Jekyll"
nav_section: Exporting to an SSG
weight: 952
---

The [Jekyll](https://jekyllrb.com/) export engine is not yet implemented. StaticShape's CLI lists Jekyll as an option, but selecting it will produce an error.

## What this engine would produce

A Jekyll export engine would generate the same [four categories of output](/docs/export-engines/) as other engines, using Liquid templates:

- **Static files** in the `assets/` directory
- **Layout templates** in `_layouts/` using Liquid syntax (e.g. `{{ variable }}`, `{% for %}`, `{% if %}`)
- **Content files** with YAML front matter in collection directories (e.g. `_posts/`, `_pages/`)
- **Jekyll config** (`_config.yml`)

## Contributing

This engine is open for contributions. See the [GitHub repository](https://github.com/cloudcannon/staticshape) to get involved. The [Hugo export engine](/docs/hugo-export-engines/) serves as a reference implementation.
