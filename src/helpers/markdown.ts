const validTags: Record<string, boolean> = {
    'p': true,
    'h1': true,
    'h2': true,
    'h3': true,
    'h4': true,
    'h5': true,
    'img': true,
    'a': true,
    'em': true,
    'strong': true,
    'ul': true,
    'ol': true,
    'li': true,
    'br': true,
    'sup': true,
    'sub': true,
    '#text': true
}

const validAttributes: Record<string, Record<string, boolean>> = {
    img: {
        'src': true,
        'alt': true
    },
    a: {
        'href': true
    }
}
