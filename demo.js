const md = require('markdown-it')()
const anchor = require('./index')

let tocObject = {}

md.use(anchor, {
  level: 1,
  // slugify: string => string,
  permalink: false,
  // renderPermalink: (slug, opts, state, permalink) => {},
  permalinkClass: 'header-anchor',
  permalinkSymbol: '¶',
  permalinkBefore: false,
  toc: tocObject
})

const src = `
%TABLE_OF_CONTENTS%
# h1-1

## h2-1
### h3-1
### h3-2

## h2-2

# h1-2

## h2-1
`

const mid = md.render(src);
console.log(mid.replace('<p>%TABLE_OF_CONTENTS%</p>', tocObject.result))