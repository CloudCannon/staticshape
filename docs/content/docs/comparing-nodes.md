---
title: "Comparing nodes"
nav_title: "Comparing nodes"
nav_section: How it works
weight: 26
---

Comparing nodes is a process of checking how equivalent two nodes are to each other. This is used heavily in StaticShape as a way to see whether nodes should be merged or should become another node, like loops and conditionals.

For example, we have two html element nodes that need to be compared:

```html
<h1>Home</h1>
```

```html
<h1>About</h1>
```

For a human, it is easy to see that these are very similar. To make this comparison automatic, we need to have a mathematical representation of how "similar" they are. In StaticShape this is called an equivalency score.

## Equivalency scores

An equivalency score is a number between 0 and 1. A good way to interpret the numbers is as a percentage, between 0% match and 100% match. This gives us a way of comparing the nodes and having thresholds for different behaviour like merging and loops.

## Scoring elements equivalency

To compare the elements listed above, the HTML needs to be parsed into an element node:

```json
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
```

```json
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
```

To compare the two elements we can now compare all of the metadata attached. This is where the code needs to be more specific about comparing the different types of nodes. In the above example, a comparison between two h1 occurs:

1. ✅ Both nodes have `type` `element`
2. ✅ Both nodes have `name` `h1`
3. ✅ Both nodes have the same `attrs`
4. 🤔 Each node has a different list of childen

From this comparison, a score can be attached to each positive match. For properties like `attrs` and `children`, we can run the scoring recursively to get a score. The max score is also calculated to put the score between 0 and 1.

## Scoring nodes tree equivalency

When a tree needs a score, each element from the first tree is compared to the element in the same position in the second tree. Each score is summed and compared with the number of nodes. 

```json
[
  {
    "type": "text",
    "value": "Home"
  }
]
```

```json
[
  {
    "type": "text",
    "value": "About"
  }
]
```

## Scoring text nodes

To finish our example, a method of scoring text nodes is needed.

```json
{
  "type": "text",
  "value": "Home"
}
```

```json
{
  "type": "text",
  "value": "About"
}
```

In the above example, a comparison between two text nodes occurs:

1. ✅ Both nodes have `type` `text`
2. 🤔 Each nodes `value` is not the same

As the `value` key in a text node is a string, a method is needed for comparing the distance between two strings. For this StaticShape uses a algorithm called [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) or [edit distance](https://en.wikipedia.org/wiki/Edit_distance). This algorithm gives a number of edits that would be required to change one string to another. This distance can be used as the score. The max score is the total number of characters in the longest string. Combining these, we can arrive at a score between 0 and 1.

