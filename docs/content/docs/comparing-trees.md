---
title: "Comparing trees"
nav_title: "Comparing trees"
nav_section: How it works
weight: 25
---

Comparing/Diffing/Merging trees is a core part of StaticShape. This is what powers all of StaticShape's templating and variables.

## Manual comparisons

For the first example, imagine trying to build a layout out of two pages (Home and About):

`index.html`
```html
<h1>Home</h1>
```

`about.html`
```html
<h1>About</h1>
```

As a human, we can see the text in the first page is different from the text in the second page and the rest is the same. Doing migrations manually, we take the text from the files and make a layout which outputs that data. The allows us to keep data and markup separate, for example: 

`index.html`
```yaml
---
text: Home
---
```

`about.html`
```yaml
---
text: About
---
```

`layout.html`
```html
<h1>{{ text }}</h1>
```

## Automated comparisons

For a computer to do this, we need to read the HTML into a format that can be interfaced with. This interface is a set of objects that represent the HTML nodes. These objects contain metadata about themselves and are organised into arrays. Some nodes have "children" which is an array of nodes that are inside the node. Putting this all together creates a tree structure which is like a [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). If you have every written any CSS selectors or used JavaScript this should feel familiar.

In the StaticShape world, there are all the "basic" nodes and some additional types to represent the following items:

1. Variables
   - Text variables
   - Markdown variables
   - Inline markdown variables
2. Loops
3. Conditionals
4. Page Content

The rest of the docs will represent trees and nodes as JSON. For the example above we can represent it as:

`index.html`
```json
[
  {
    "type": "element",
    "name": "h1",
    "attrs": {},
    "children": [
      {
         "type": "text",
         "value": "Home"
      }
    ]
  }
]
```

`about.html`
```json
[
  {
    "type": "element",
    "name": "h1",
    "attrs": {},
    "children": [
      {
         "type": "text",
         "value": "About"
      }
    ]
  }
]
```

In each file, the tree (root array) has one element node which has a text node as a child. To compare these two trees we take the following steps:

1. Create a new array for the merged tree
2. Collect the first node from each tree
3. Compare them to determine if they are a ["good match"](/docs/comparing-nodes/):
   - If the nodes match: Merge the two nodes together. If the two nodes have children, run this merge recursively.
   - Else: Add a conditional node
4. Keep going until there are no nodes, If one tree runs out first, all remaining nodes are added as conditional nodes.
5. Return the new merged tree and data from variables.

Step by step for this example would be:

1. Create a new array
2. Compare `h1` node from `index.html` to the `h1` node from `about.html`
3. Combine the two `h1` nodes to create a new `h1` node, recursively merge the child trees:
   1. Create a new array
   2. Compare `text` node from `index.html` to the `text` node from `about.html`
   3. Combine the two `text` nodes by creating a `variable` node
   4. Keep track of the new variable for `index.html` and `about.html`
   4. Add the new node to our merged array
   5. No more nodes to compare, return the merged tree
4. Add the new node to our merged array
5. No more nodes to compare, return the merged tree

This gives a similar result to the manual example in JSON:

`index.html`
```json
{
  "text": "Home"
}
```

`about.html`
```json
{
  "text": "About"
}
```

`layout`
```json
[
  {
    "type": "element",
    "name": "h1",
    "attrs": {},
    "children": [
      {
         "type": "variable",
         "reference": [
            "text"
         ]
      }
    ]
  }
]
```
