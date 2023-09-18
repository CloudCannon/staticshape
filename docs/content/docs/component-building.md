---
title: "Component building"
nav_title: "Component building"
nav_section: How it works
weight: 27
---

Component building is a concept used to add variables and loops to data. This works differently to the node diffing as it works only on a single node. The node is passed to a function which has a predefined list of values that should become variables. 

## Loops

All node trees are checked for repeated blocks. Any found are turned into `loop` nodes through comparing each element.

```html
<div class="logo-ticker">
	<div class="logo-1">
		<img
			alt=""
			class="gallery-image"
			src="/images/logos/1.svg"
		/>
	</div>

	<div class="logo-2">
		<img
			alt=""
			class="gallery-image"
			src="/images/logos/2.svg"
		/>
	</div>

	<div class="logo-3">
		<img
			alt=""
			class="gallery-image"
			src="/images/logos/3.svg"
		/>
	</div>
</div>
```

Gets converted into templating like:

```html
<div class="logo-ticker">
    {% for item in logo_ticker %}
	<div class="{{ item.class }}">
		<img
			alt="{{ item.alt }}"
			class="gallery-image"
			src="{{ item.src }}"
		/>
	</div>
    {% end %}
</div>
```

## Markdown blocks

All node trees are checked for markdown blocks. Any found are turned into `markdown-variable` nodes.

```html
<h2>Heading</h2>
<p>Hi there</p>
```

Gets converted into templating like:

```html
{{ markdown | markdownify }}
```

## Inline markdown blocks

All node trees are checked for inline markdown blocks. Any found are turned into `inline-markdown-variable` nodes.

For example, an html block like:

```html
<h2 class="c-heading">Here is some text with <a href="">a link</a></h2>
```

Gets converted into templating like:

```html
<h2 class="c-heading">{{ markdown | inline_markdownify }}</h2>
```

## Editable attributes

The following attributes are converted into variable attributes:

- `href`
- `src`
- `srcset`
- `alt`
- `title`

For example, an html block like:

```html
<img src="goose.jpg" alt="A goose" title="A goose's tooltip">
```

Gets converted into templating like:

```html
<img src="{{ src }}" alt="{{ alt }}" title="{{ title }}">
```