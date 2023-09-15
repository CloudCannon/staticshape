---
title: "Loop nodes"
nav_title: "Loops"
nav_section: Nodes
weight: 7
---

A loop is a very common part of building a website. It allows for nodes to be repeated with different data. In combination with variables and conditionals it covers the core items on a website. Use cases for a loop are:

- Blog posts list
- Tags/badges
- Navigation items

## Input Formats

In a static site a loop can take a few cases which StaticShape needs interpret. A list of `li` elements will be used to show the different cases. Any element with a high enough equivalency score to it's siblings will be a loop candidate.

### A set of elements one after another

This is the easiest case for finding a loop. There are two or more elements one after another to parse and pull out the variables. The elements can be compared for equivalency and diffed against each other to build a template.

```html
<ul>
  <li class="tv-ratings">PG</li>
  <li class="tv-ratings">G</li>
</ul>
```

### A single element

This is a harder case for a loop. There is a single element which means this will need to be parsed as a element to begin with. Once this is merged with another page with the same element, we can determine it is a loop through element equivalency.

```html
<ul>
  <li class="tv-ratings">R</li>
</ul>
```

In the event the other page has a loop, this can be diffed against the existing template with new variables being added if needed. 

This becomes trickier if the other page has a single element as the items still aren't proven to be a loop. In this case data migration will need to occur when it eventually merges with a page with a loop.

### No elements

This is a loop with no items. There isn't a single element. No action in parsing this node.

```html
<ul></ul>
```

With this case in mind, it helps to prove that a loop which has no pairing in a dom diff should be added with no conditional.

## Output Format

Loop nodes use the type `ASTLoopNode` which has the following format:

```typescript
{
  type: 'loop';
  reference: string[];
  template: ASTElementNode;
}
```

Loops will reference an array in the data and for each item of data produce the specified template. This will reset the variable `references` namespace for exporting. An example of a loop is:

```json
[
  {
    "type": "element",
    "name": "ul",
    "attrs": {},
    "children": [
      {
        "type": "loop",
        "reference": ["ratings"],
        "template": [
          {
            "type": "element",
            "name": "li",
            "attrs": { "class": { "type": "attribute", "name": "class", "value": "tv-ratings" } },
            "children": [
              { "type": "variable", "reference": ["text"] }
            ]
          }
        ]
      }
    ]
  }
]
```

Which can be exported into the following liquid templating:

```html
<ul>
  {% for item in ratings %}
  <li class="tv-ratings">
    {{ item.text }}
  </li>
  {% end %}
</ul>
```

> Whitespace text nodes are ommitted from the example to reduce complexity.

## Merging rules

Loops can be merged with:

- Loop nodes
- Conditional nodes
- Element nodes

Loops cannot be merged with:

- Text nodes
- Comment nodes
- Cdata nodes
- Variable nodes
- Doctype nodes
- Content nodes
- Markdown variable nodes
- Inline markdown variable nodes
