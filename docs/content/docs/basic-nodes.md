---
title: "Basic Nodes"
nav_title: "Basic Nodes"
nav_section: Nodes
weight: 44
---

The following are [standard HTML nodes](https://developer.mozilla.org/en-US/docs/Web/API/Node) used to represent static content. 

## Text nodes

A [text node](https://developer.mozilla.org/en-US/docs/Web/API/Text) represents a string of text within the DOM. Text nodes can be left as a Text node or converted into a [Variable node](/docs/variable-nodes/).

```html
I'm text
```

```json
{
  "type": "text",
  "value": "I'm text"
}
```

## Element nodes

An [element node](https://developer.mozilla.org/en-US/docs/Web/API/Element) represents an HTML container, e.g. `div`, `p`, `html`. Elements can contain other nodes within the key `children`. Processed element nodes can be left as an element node, converted into a conditional node, or converted into a loop node. Some elements are considered to be a markdown block or be part of an inline markdown block which is converted into a [Variable node](/docs/variable-nodes/).

```html
<div><img src="goose.png"></div>
```

```json
{
  "type": "element",
  "name": "div",
  "attrs": {},
  "children": [
    {
      "type": "element",
      "name": "img",
      "attrs": {
        "img": {
          "type": "attribute",
          "name": "src",
          "value": "goose.png"
        }
      },
      "children": []
    }
  ]
}
```


## Comment nodes

A [comment node](https://developer.mozilla.org/en-US/docs/Web/API/Comment) represents a string of text printed between `<!--` and `-->`. Comments are never turned into conditionals, loops or variables.

```html
<!-- I'm a comment -->
```

```json
{
  "type": "comment",
  "value": "I'm a comment"
}
```

## Doctype nodes

A [doctype node](https://developer.mozilla.org/en-US/docs/Web/API/DocumentType) represents how a document should be processed by the HTML processor. Doctype nodes are never turned into conditionals, loops or variables.

```html
<!doctype html>
```

```json
{
  "type": "doctype",
  "value": "html"
}
```

## Cdata nodes

Unused and largely ignored, [see MDN](https://developer.mozilla.org/en-US/docs/Web/API/CDATASection).

```html
<![CDATA[ … ]]>
```

```json
{
  "type": "cdata",
  "value": "…"
}
```