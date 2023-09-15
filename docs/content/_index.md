---
title: Staticshape
nav_title: Home
weight: 1
---

Staticshape is a tool for automatically shaping any fully static site into a site that can be built with a static site generator (SSG).

Using an SSG is more popular than ever and gives enormous benefits to the developers, content editors, and end users of the website. However, migrating your existing website to an SSG can take a long time, especially if you have a large number of pages. Transitioning to an SSG can be even more daunting if you have more than one website. 

## What is the goal of Staticshape?

Staticshape is designed to streamline site migrations from any framework to your SSG of choice. Staticshape consists of two main functions: 

1. Scraping any existing site and saving its pages locally
2. Turning this static output into data and layouts that are well formatted for your chosen SSG

![Diagram of a static site being shaped back into a SSG codebase](/how-staticshape-works.svg)

## What is a scraper?

A scraper is a tool to download any live site into a static site. It doesn't matter whether the initial site is built with Wordpress, Drupal, Geocities, or any other framework. Simply enter a URL and the scraper will download the html from that page and recursively download any connected files. After downloading all the files, you will have a local static version of the live site. Now all that is left is to run Staticshape on that folder, which will create your SSG codebase. 

![Diagram of a live site being downloaded into a static site](/how-a-scraper-works.svg)

## What is an SSG?

An SSG is a build tool used by developers to manage a static website. This helps maintain all of the benefits of static (secure, performance, flexibility) and adds a layer of additional benefits:

- Ease of maintenance
- Separation of data and markup
- CMS editable (see [CloudCannon](https://cloudcannon.com/))

In essence the content for the website is stored in markdown, yaml, json, toml and html. The website's markup is generated with variables, loops, conditionals, shared layouts and shared components. Using an SSG over a purely static site is good practice for any site larger than a single page.

![Diagram of an SSG codebase being built to a static site](/how-an-ssg-works.svg)
