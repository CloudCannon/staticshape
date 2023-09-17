---
title: "Conditional nodes"
nav_title: "Conditionals"
nav_section: Nodes
weight: 48
---

A conditional is a very common part of building a website. It allows for nodes to exist in some places and not in others. Use cases for a conditional are:

- Page banners
- Warnings and notices
- Extra labels and documentation

## Input Formats

StaticShape needs to diff two node trees to detect a conditional. A conditional is added if a node is in one tree but not in the other. For example, below we have two similar looking trees. In the first example, we have a `div.banner` to open the page. The second example skips this element. StaticShape diffs the two trees, finds no matching banner div in the body of the second page and adds a conditional node in it's place.

```html
<div class="banner">. . .</div>
<h1>My site title</h1>
. . .
```

```html
<h1>My site title</h1>
. . .
```

StaticShape uses dom diffing to generate conditionals in documents, loop nodes or between conditionals nodes.

## Output Format

Conditional nodes use the type `ASTconditionalNode` which has the following format:

```typescript
{
  type: 'conditional';
  reference: string[];
  child: ASTElementNode;
}
```

Conditionals will reference an array in the data and for each item of data produce the specified template. This will reset the variable `references` namespace for exporting. An example of a conditional is:

```json
[
  {
    "type": "conditional",
    "reference": ["banner"],
    "template": [
      {
        "type": "element",
        "name": "div",
        "attrs": { "class": { "type": "attribute", "name": "class", "value": "banner" } },
        "children": [
          . . .
        ]
      }
    ]
  }
]
```

Which can be exported into the following liquid templating:

```html
{% if banner %}<div class="banner">. . .</div>{% end %}
```

> Child and sibling nodes are ommitted from the example to reduce complexity.

## Merging rules

Conditionals can be merged with:

- Loop nodes
- Conditional nodes
- Element nodes

Conditionals cannot be merged with:

- Text nodes
- Comment nodes
- Cdata nodes
- Variable nodes
- Doctype nodes
- Content nodes
- Markdown variable nodes
- Inline markdown variable nodes
