---
title: "Configuring Collections"
nav_title: "Configuring Collections"
nav_section: Configuration
weight: 22
---

## What is a Collection

A Collection is a general SSG term used to define a group of files. A collections could be:

- Pages, e.g. general pages, landing pages
- People, e.g. staff members, authors, contributors
- News, e.g. blogs, articles, press releases
- Items, e.g. products, collectables, books

## JSON Options

The most basic configuration file has one collection with no `content` tag configured:

```json
{
  "collections": [
    {
      "name": "pages"
    }
  ]
}
```

The above example says every HTML within the root directory is to be considered part of the `pages` collection.

Each file in a collection will only be compared to each other. This means that if a page does not significantly match the other pages, you should create another collection. In the next example a `policies` collection is added. The policies HTML files are all within the folder `policies` which can be specified using the `subPath` attribute. The `subPath` attribute defaults to the root directory and should be unique across the collections. In this example, `policies` has a more specific `subPath` than the  `pages` collection. A collection should not process files which are referenced with more specificity to prevent double processing.

```json
{
  "collections": [
    {
      "name": "pages"
    },
    {
      "name": "policies",
      "subPath": "policies"
    }
  ]
}
```

### Additional filtering
In some cases, collection borders don't nicely fall into the folders. This is where some additional filtering comes in handy.

#### Only

The `only` option takes an array of pathnames that are the only files to be included in the collection. This overrides all filtering options including `subPath`.

```json
{
  "collections": [
    {
      "name": "pages",
      "only": [
        "index.html"
      ]
    }
  ]
}
```

#### Include

The `include` option takes an array of pathnames to be included outside of the `subPath` option.

```json
{
  "collections": [
    {
      "name": "policies",
      "subPath": "policies",
      "include": [
        "policies.html"
      ]
    }
  ]
}
```

#### Exclude

The `exclude` option takes an array of pathnames to be excluded inside of the `subPath` option.

```json
{
  "collections": [
    {
      "name": "policies",
      "subPath": "policies",
      "exclude": [
        "policies/list.html"
      ]
    }
  ]
}
```