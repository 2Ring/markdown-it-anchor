const markdownit = require('markdown-it')()

const slugify = (s) => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-'))

const position = {
  false: 'push',
  true: 'unshift'
}

const hasProp = Object.prototype.hasOwnProperty

const permalinkHref = slug => `#${slug}`

const renderPermalink = (slug, opts, state, idx) => {
  const space = () => Object.assign(new state.Token('text', '', 0), { content: ' ' })

  const linkTokens = [
    Object.assign(new state.Token('link_open', 'a', 1), {
      attrs: [
        ['class', opts.permalinkClass],
        ['href', opts.permalinkHref(slug, state)],
        ['aria-hidden', 'true']
      ]
    }),
    Object.assign(new state.Token('html_block', '', 0), { content: opts.permalinkSymbol }),
    new state.Token('link_close', 'a', -1)
  ]

  // `push` or `unshift` according to position option.
  // Space is at the opposite side.
  linkTokens[position[!opts.permalinkBefore]](space())
  state.tokens[idx + 1].children[position[opts.permalinkBefore]](...linkTokens)
}

const getTocToken = (tokens) => {
  tocToken = null;
  tokens.forEach((token) => {
    if (token.content === "%TABLE_OF_CONTENTS%") {
      tocToken = token
    }
  })
  return tocToken
}

const uniqueSlug = (slug, slugs) => {
  let uniq = slug
  let i = 2
  while (hasProp.call(slugs, uniq)) uniq = `${slug}-${i++}`
  slugs[uniq] = true
  return uniq
}

const generateTocText = (titles, tocLevel, anchorPrefix) => {
  let compositeToc = "";
  if (tocLevel !== null) {
    let tocPrefix = new Array(tocLevel).fill('#').join('')
    compositeToc += tocPrefix + ' Table of contents\n'
  }
  titles.forEach((title) => {
    for (let i = 0; i < title.depth; i++) {
      compositeToc += '  '
    }
    compositeToc += '- [' + title.title + '](' + anchorPrefix + '#' + title.id + ')\n'
  })

  return markdownit.render(compositeToc)
}

const isLevelSelectedNumber = selection => level => level >= selection
const isLevelSelectedArray = selection => level => selection.includes(level)

const anchor = (md, opts) => {
  opts = Object.assign({}, anchor.defaults, opts)

  let tocTitles = [];

  md.core.ruler.push('anchor', state => {
    const slugs = {}
    const tokens = state.tokens

    const tocToken = getTocToken(tokens);
    const titles = [];

    if (tocToken) {
      let tocIndex = tokens.indexOf(tocToken);
      let opening = tokens[tocIndex - 1];
      let closing = tokens[tocIndex + 1];
      tokens[tocIndex].type = 'toc_container'
      tokens.splice(tokens.indexOf(opening), 1)
      tokens.splice(tokens.indexOf(closing), 1)
    }

    const isLevelSelected = Array.isArray(opts.level)
      ? isLevelSelectedArray(opts.level)
      : isLevelSelectedNumber(opts.level)

    const startingLevel = Array.isArray(opts.level) ? opts.level[0] : opts.level;
    let formerHeaders = [];

    tokens
      .filter(token => token.type === 'heading_open')
      .filter(token => isLevelSelected(Number(token.tag.substr(1))))
      .forEach(token => {
        // Aggregate the next token children text.
        const title = tokens[tokens.indexOf(token) + 1].children
          .filter(token => token.type === 'text' || token.type === 'code_inline')
          .reduce((acc, t) => acc + t.content, '')

        const currentLevel = Number(token.tag.substr(1))
        if (currentLevel === startingLevel) {
          formerHeaders = [title]
        }
        else {
          if (startingLevel + formerHeaders.length - 1 >= currentLevel) {
            while (startingLevel + formerHeaders.length - 1 >= currentLevel) {
              formerHeaders.pop()
            }
          }
          formerHeaders.push(title)
        }

        let slug = token.attrGet('id')

        if (slug == null) {
          slug = uniqueSlug(opts.slugify(formerHeaders.join(" ")), slugs)
          token.attrPush(['id', slug])
        }

        titles.push({
          title: title,
          id: slug,
          depth: currentLevel - startingLevel
        })

        if (opts.permalink) {
          opts.renderPermalink(slug, opts, state, tokens.indexOf(token))
        }

        if (opts.callback) {
          opts.callback(token, { slug, title })
        }
      })

      tocTitles = titles
      opts.toc.toc = generateTocText(tocTitles, opts.tocLevel, opts.filename);
  })

  md.renderer.rules['toc_container'] = (tokens, idx, _opts, _env, self) => {
    return generateTocText(tocTitles, opts.tocLevel, opts.filename);
  }
}

anchor.defaults = {
  level: 1,
  slugify,
  permalink: false,
  renderPermalink,
  permalinkClass: 'header-anchor',
  permalinkSymbol: '¶',
  permalinkBefore: false,
  permalinkHref,
  tocLevel: 2,
  toc: { toc: undefined },
  filename: ''
}

module.exports = anchor
