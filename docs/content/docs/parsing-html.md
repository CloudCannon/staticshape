---
title: "Parsing HTML"
nav_title: "Parsing HTML"
nav_section: How it works
weight: 22
---

For StaticShape to read produce a SSG site, it must have a way of reading HTML files and converting them into a programmable interface.

HTML files are loaded as text into a [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model). This DOM can then be read from the root right down to the individual text and child nodes. StaticShape reads this DOM and converts it into a set of [basic nodes](/docs/basic-nodes/). These basic nodes can be used with StaticShape to produce layouts.

This step additionally converts any node configured as `content` to be a [content node](/docs/content-node/). This is because the DOM allows us to use CSS selectors which would be difficult to implement. This also simplifies diffing the resulting basic nodes as the tree size has significantly been reduced.

Parsing the document will produce a tree of nodes for both `layout` and `content`. 