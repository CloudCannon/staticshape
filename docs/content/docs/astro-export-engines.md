---
title: "Exporting to Astro"
nav_title: "Exporting to Astro"
nav_section: Exporting to an SSG
weight: 952
---

The [Astro](https://astro.build/) export engine is not yet implemented. StaticShape's CLI lists Astro as an option, but selecting it will produce an error.

## What this engine would produce

An Astro export engine would generate the same [four categories of output](/docs/export-engines/) as other engines, using Astro's component syntax:

- **Static files** in the `public/` directory
- **Layout templates** as `.astro` components with frontmatter scripts and template expressions (e.g. `{variable}`, `{items.map()}`)
- **Content files** as Markdown with YAML front matter in `src/content/`
- **Astro config** (`astro.config.mjs`)

## Contributing

This engine is open for contributions. See the [GitHub repository](https://github.com/cloudcannon/staticshape) to get involved. The [Hugo export engine](/docs/hugo-export-engines/) serves as a reference implementation.
