---
title: "Variables"
nav_title: "Variables"
nav_section: Nodes
weight: 45
---

Variables are used to represent text and a subset of elements.

## Variable

A standard variable used to represent text with no additional processing required.

### Example

```html
<title>Welcome</title>
```

### AST

```json
{
  "type": "element",
  "name": "title",
  "attrs": {},
  "children": [
    {
      "type": "variable",
      "reference": [
        "variable_name"
      ]
    }
  ]
}
```

### Variable content

```
Welcome
```

## Markdown variable

A variable used to represent a block of markdown. This is generated from a node tree which only contains the following elements:

- text (whitespace only)
- h1
- h2
- h3
- h4
- h5
- p
- img
- ul
- ol

Additionally tags can only contain attributes that can be represented in markdown.

### Example
```html
<h1>Hi <strong>there</strong></h1>

<p>Welcome back!</p>
```

### AST

```json
{
  "type": "markdown-variable",
  "reference": [
  "variable_name"
  ]
}
```

### Variable content

```markdown
# Hi **there**

Welcome back!
```

## Inline markdown variables

A variable used to represent the markdown inside of a markdown element. This is generated from a node tree which only contains the following elements:

- text
- a
- em
- strong
- img
- br
- sup
- sub

### Example

```html
<h1 class="heading">Hi <strong>there</strong></h1>
```

### AST

```json
{
  "type": "element",
  "name": "h1",
  "attrs": {
    "class": {
      "type": "attribute",
      "name": "class",
      "value": "heading"
    }
  },
  "children": [
    {
      "type": "inline-markdown-variable",
      "reference": [
        "variable_name"
      ]
    }
  ]
}
```

### Variable content

```markdown
Hi **there**
```
