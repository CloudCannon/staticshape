# Testing

Since this project will have plenty of opinions it is good to cover each decision with a test. These will start simple and grow larger and more complex.

## Test: 0-layouts-basic

This test is a basic example of two HTML files with exact content before and after a heading with different content.

This test should create a layout with no variables other then a content section.

## Test: 1-layouts-title-variable

This test is a basic example of two HTML files with almost the exact content before and after a heading with different content. The two pages have different content in their titles.

This test should create a layout with a title variables and a content section.

## Test: 2-layouts-nav (Unsolved)

This test is a basic example of two HTML files with almost the exact content before and after a heading with different content. The two pages have a nav with an active classes on different links and their titles are different.

This test should create a layout with variables and a content section. The class difference is currently unhandled.


## Test: 3-layouts-different-meta-order

This test is a basic example of two HTML files with almost the exact content before and after a heading with different content. The two pages have the head tags in a different order. The order doesn't matter and therefore should be ignored in layout generation.

This test should create a single layout with variables and a content section.

