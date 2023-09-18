---
title: "Configuring page content"
nav_title: "Configuring page content"
nav_section: Configuration
weight: 22
---

## What is page content?

In order to separate your page content from your layouts, StaticShape needs to know which elements of your pages are defined as content. In practice, page content is the distinct markup for a given page. 

For example, the page content of a blog post would be the complete text of the article, including headings. The page layout and data for a blog post would include elements such as author, title, tags, and meta description. 

## JSON Options

By default, StaticShape applies no content selector. 

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

The `selector` option functions like a CSS selector, in that it allows you to define patterns within your static pages and then set page elements as content nodes. Use `selector` when your page content is clearly defined, for example within a single `<div>`.

The below example defines the main content for files within the "pages" collection, and will separate the content, excluding it from the layout diffing. 

```json
{
  "collections": [
    {
      "name": "pages",
      "content": {
        "selector": "body"
      }
    }
  ]
}
```

### beforeSelector and afterSelector

The `beforeSelector` and `afterSelector` options are recommended when your page content has no clear hierarchy or does not use content blocks. You can use either option separately, or you can use both options to indicate the page content node. 

The below example defines the page content as all material between the nav and the footer.

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

If used separately, the `afterSelector` option stops looking once it reaches the end of the current node tree. Similarly, the `beforeSelector` option stops once it reaches the beginning of the current node tree.