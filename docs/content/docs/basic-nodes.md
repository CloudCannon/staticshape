---
title: "Basic Nodes"
nav_title: "Basic Nodes"
nav_section: Nodes
weight: 4
---

TODO

## Text nodes

TODO

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

TODO

```html
<img src="goose.png">
```

```json
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
```

## Comment nodes

Processed and added during a diff. Never turned into conditionals, loops or variables.

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

Processed and added during a diff. Never turned into conditionals, loops or variables.

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

Unused and misunderstood, [see MDN](https://developer.mozilla.org/en-US/docs/Web/API/CDATASection).

```html
<![CDATA[ … ]]>
```

```json
{
    "type": "cdata",
    "value": "…"
}
```