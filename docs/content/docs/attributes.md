---
title: "Attributes"
nav_title: "Attributes"
nav_section: Nodes
weight: 5
---

TODO

## Attribute

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

## Variable Attribute

TODO

```html
<img src="{{ image }}">
```

```json
{
    "type": "element",
    "name": "img",
    "attrs": {
        "img": {
            "type": "variable-attribute",
            "name": "src",
            "reference": ["image"]
        }
    },
    "children": []
}
```

## Conditional Attribute

TODO

```html
<img {% if image %}src="{{ image }}"{% end %}>
```

```json
{
    "type": "element",
    "name": "img",
    "attrs": {
        "img": {
            "type": "conditional-attribute",
            "name": "src",
            "reference": ["image"]
        }
    },
    "children": []
}
```