---
title: StaticShape
nav_title: Home
weight: 1
---

StaticShape is a tool for automatically shaping a fully static site into an SSG site.

## What is the goal of StaticShape?

StaticShape is designed to streamline migrations from any site to your SSG of choice. StaticShape reads a folder containing your static site and turns your pages into data and layouts accordingly.

![Diagram of a static site being shaped back into a SSG codebase](/how-staticshape-works.svg)

Using an SSG gives enormous benefits to the developers, content editors and end users of the website. However, migrating your existing website to an SSG can take a long time, especially if you have a large number of pages. Transitioning to an SSG is even more daunting if you have more than one website. 

## What is an SSG?

A Static Site Generator (SSG) is a tool used by developers to manage a static website. This helps maintain all of the benefits of static (secure, performance, flexibility) and adds a layer of additional benefits:

- Maintainable
- Data and markup separated
- CMS editable (see [CloudCannon](https://cloudcannon.com/))

In essence the content for the website is stored in markdown, yaml, json, toml and html. The website's markup is generated with variables, loops, conditionals, shared layouts and shared components. Using an SSG over a purely static site is essential for any site larger than one page.

![Diagram of an SSG codebase being built to a static site](/how-an-ssg-works.svg)

## What is a scraper?

A scraper is a tool to download any live site into a static site. Enter a URL and the scraper will download the html from that page and recursively download any connected files. After downloading all the files, you will have a static version of the live site. Now all that is left is to run StaticShape on that folder and you have an SSG codebase. It doesn't matter what tool you use to build the original site — you can scrape from Wordpress, Drupal, Geocities, or any framework. 

![Diagram of a live site being downloaded into a static site](/how-a-scraper-works.svg)

For a convenient site scraper, see [SiteScrape](https://github.com/CloudCannon/sitescrape).
