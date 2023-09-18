---
title: "Configuring page content"
nav_title: "Configuring page content"
nav_section: Configuration
weight: 22
---

## What is page content?

TODO

## JSON Options

TODO

```json
{
  "collections": [
    {
      "name": "pages"
    }
  ]
}
```

### selector

The `selector` option... TODO

```json
{
  "collections": [
    {
      "name": "pages",
      "content": {
        "selector": "#main"
      }
    }
  ]
}
```

### afterSelector

The `afterSelector` option... TODO

```json
{
  "collections": [
    {
      "name": "pages",
      "content": {
        "afterSelector": "nav"
      }
    }
  ]
}
```

### beforeSelector

The `beforeSelector` option... TODO

```json
{
  "collections": [
    {
      "name": "pages",
      "content": {
        "afterSelector": "nav",
        "beforeSelector": "footer"
      }
    }
  ]
}
```
