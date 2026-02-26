---
title: "Exporting to Hugo"
nav_title: "Exporting to Hugo"
nav_section: Exporting to an SSG
weight: 952
---

The Hugo export engine generates a [Hugo](https://gohugo.io/) site using Go template syntax. This is the first fully implemented export engine in StaticShape.

## Output structure

```
output/
├── hugo.yaml
├── cloudcannon.config.yaml
├── static/
│   └── (all non-HTML source files)
├── layouts/
│   └── {collection}/
│       └── list.html
└── content/
    ├── {collection}/
    │   └── {page}.html
    └── {page}.html        (pages collection only)
```

## Static files

All non-HTML files are copied into the `static/` directory, preserving their original folder structure.

## Config files

### Hugo config

Generates `hugo.yaml` at the root of the output:

```yaml
baseURL: ''
```

### CloudCannon config

Generates a placeholder `cloudcannon.config.yaml` at the root of the output.

## Layouts

Each collection gets a layout file at `layouts/{collection}/list.html`. The layout contains the shared HTML structure with Go template tags replacing the dynamic parts.

### Variables

Text and attribute differences between pages become Go template variables scoped under `.Params`:

```html
<title>{{ .Params.title }}</title>
```

### Variable attributes

Attributes that differ between pages (such as `href`, `src`, `alt`) are rendered as template expressions inside the attribute value:

```html
<img src="{{ .Params.src }}" alt="{{ .Params.alt }}">
```

### Markdown

Blocks detected as [markdown variables](/docs/variable-nodes/#markdown-variable) are piped through Hugo's `markdownify` function:

```html
{{ .Params.body_text | markdownify }}
```

[Inline markdown variables](/docs/variable-nodes/#inline-markdown-variables) also use `markdownify`:

```html
<h2>{{ .Params.heading | markdownify }}</h2>
```

### Conditionals

Elements that appear on some pages but not others become `with` blocks:

```html
{{ with .Params.banner }}
  <div class="banner">...</div>
{{ end }}
```

Inside a conditional, the variable scope resets to `.` so child references are relative to the conditional's data.

### Conditional attributes

Attributes that exist on some pages but not others:

```html
{{ with .Params.open }}{{ . }}{{ end }}
```

### Loops

Repeated elements become `range` blocks:

```html
{{ range .Params.ratings }}
  <li class="tv-ratings">{{ .text }}</li>
{{ end }}
```

Inside a loop, the variable scope resets to `.` so child references are relative to the current loop item.

### Content

The [content node](/docs/content-node/) renders as Hugo's standard content tag:

```html
{{ .Content }}
```

## Content files

Each page produces a content file with YAML front matter and rendered content.

### File paths

- For the `pages` collection: `content/{page}.html`
- For other collections: `content/{collection}/{page}.html`
- Files named `index.html` are renamed to `_index.html` (Hugo's convention for section pages)

### Front matter

Front matter is generated as YAML with keys sorted alphabetically. A `type` field is added automatically, set to the collection name, which tells Hugo which layout to use:

```yaml
---
alt: A photo of the beach
href: /attractions/beach
title: Beach Walk
type: attractions
---
```

## Parameter formatting

Variable references from the AST are converted into Hugo-compatible parameter names:

- Array references are joined with `.` (e.g. `["ratings", "text"]` becomes `ratings.text`)
- Special characters (`-`, `:`, spaces, `@`) are replaced with underscores

## Known limitations

- Layouts are fixed to `list.html` — there is no base template or shared layout across collections
- `<script>` tags are replaced with HTML comments in the output
- Inline markdown uses `markdownify` rather than a dedicated inline markdown filter
- The CloudCannon config is a placeholder and not yet fully generated
