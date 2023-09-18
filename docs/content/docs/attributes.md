---
title: "Attributes"
nav_title: "Attributes"
nav_section: Nodes
weight: 45
---

The following are [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) used to represent the metadata on an element. 

## Attribute

A static attribute which explicitly states the value of the attribute.

### Example output

```html
<img src="goose.png">
```

### AST

```json
{
    "type": "element",
    "name": "img",
    "attrs": {
        "src": {
            "type": "attribute",
            "name": "src",
            "value": "goose.png"
        }
    },
    "children": []
}
```

## Variable Attribute

A variable attribute which references a data value.


### Example output

```html
<img src="{{ image }}">
```

### AST

```json
{
    "type": "element",
    "name": "img",
    "attrs": {
        "src": {
            "type": "variable-attribute",
            "name": "src",
            "reference": ["image"]
        }
    },
    "children": []
}
```

## Conditional Attribute

Similar to a variable attribute except the attributes existance is also variable. Only used [for boolean attributes](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attribute).


### Example output

```html
<img {% if image %}src="{{ image }}"{% end %}>
```

### AST

```json
{
    "type": "element",
    "name": "img",
    "attrs": {
        "src": {
            "type": "conditional-attribute",
            "name": "src",
            "reference": ["image"]
        }
    },
    "children": []
}
```