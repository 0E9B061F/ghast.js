'use strict'


function normalize(node, ...list) {
  let res = []
  let buf = ''
  let ast = []
  let reg = []
  let last = null
  let item
  for (let i = 0; i < list.length; i++) {
    item = list[i]
    if (!item) return
    if (Array.isArray(item)) {
      const norm = normalize(node, ...item)
      if (last && norm.nodes.length) {
        norm.nodes[0].left = last
        last.right = norm.nodes[0]
      }
      if (buf.length) {
        if (typeof(norm.syntax[0]) == 'string') {
          buf += norm.syntax.shift()
          if (norm.syntax.length) {
            res.push(buf)
            buf = ''
          }
        } else {
          res.push(buf)
          buf = ''
        }
      }
      if (typeof(norm.syntax[norm.syntax.length-1]) == 'string') {
        buf += norm.syntax.pop()
      }
      res = res.concat(norm.syntax)
      ast = ast.concat(norm.nodes)
      if (ast.length) last = ast[ast.length-1]
    }
    else if (typeof(item) == 'string') buf += item
    else if (item.constructor.name == 'AST') {
      if (buf.length) {
        res.push(buf)
        buf = ''
      }
      item.parent = node
      if (last) {
        item.left = last
        last.right = item
      }
      res.push(item)
      ast.push(item)
      last = item
    } else {
      throw new Error('Invalid object found in syntax.')
    }
  }
  res.push(buf)
  return {syntax: res, nodes: ast, regions: reg}
}

class AST {
  constructor(opt) {
    const conf = {syntax: [], attrs: {}, tags: []}
    Object.assign(conf, opt)
    this.id = conf.id
    const norm = normalize(this, ...conf.syntax)
    this.syntax = norm.syntax
    this.attrs = conf.attrs
    this.parent = false
    this.left = false
    this.right = false
    this.nodes = norm.nodes
    this.tags = []
    this.tag(conf.tags)
    if (!this.id) throw new Error('Node must have an ID.')
    if (typeof(this.id) != 'string') throw new Error('Node ID must be a string.')
  }

  get isRoot() { return (!this.parent) }
  get isLeaf() { return (this.nodes.length < 1) }
  get image() {
    return this.syntax.map((syn)=> {
      if (typeof(syn) == 'string') return syn
      else return syn.image
    }).join('')
  }
  get rightmostNode() { return this.nodes[this.nodes.length-1] || null }
  get leftmostNode() { return this.nodes[0] || null }
  get rightmostLeaf() {
    if (this.isLeaf) return this
    if (this.rightmostNode.isLeaf) {
      return this.rightmostNode
    } else {
      return this.rightmostNode.rightmostLeaf
    }
  }
  get leftmostLeaf() {
    if (this.isLeaf) return this
    if (this.leftmostNode.isLeaf) {
      return this.leftmostNode
    } else {
      return this.leftmostNode.leftmostLeaf
    }
  }
  get goLeft() {
    if (this.isRoot) return this
    if (this.left) return this.left
    else return this.parent.goLeft.rightmostLeaf
  }
  get goRight() {
    if (this.isRoot) return this
    if (this.right) return this.right
    else return this.parent.goRight.leftmostLeaf
  }
  get goUp() {
    if (this.isRoot) return this
    else return this.parent
  }
  get goDown() {
    if (this.isLeaf) return this
    else return this.leftmostNode
  }
  get sequence() {
    const seq = []
    this.walk(node=> seq.push(node))
    return seq
  }
  get leafSequence() {
    const seq = []
    this.walk(node=> { if (node.isLeaf) seq.push(node) })
    return seq
  }

  /**
  /* Manually walk the tree. Example:
  /*   root.manualWalk(
  /*     node=> node.goDown
  /*     node=> node.goRight
  /*     node=> node.leftmostLeaf
  /*     node=> node.goUp
  /*   )
  */
  manualWalk(...cb) {
    if (!cb.length) return this
    const res = cb.shift(this)
    if (res) res.manualWalk(...cb)
    else return this
  }
  walk(cb) {
    cb(this)
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].walk(cb)
    }
  }
  ancestor(id) {
    if (!this.parent) return null
    if (this.parent.id == id) return this.parent
    else return this.parent.ancestor(id)
  }
  each(id, cb) {
    let matched = []
    let node
    for (let i = 0; i < this.nodes.length; i++) {
      node = this.nodes[i]
      if (node.id == id) matched.push(node)
      const submatch = node.each(id)
      if (submatch.length) matched = matched.concat(submatch)
    }
    if (cb) {
      for (let i = 0; i < matched.length; i++) {
        cb(matched[i])
      }
    } else return matched
  }
  first(id, cb) {
    let node
    let match
    for (let i = 0; i < this.nodes.length; i += 1) {
      node = this.nodes[i]
      match = id[0] == '.' ? node.hasTag(id.slice(1)) : node.id == id
      if (match) {
        if (cb) cb(node)
        return node
      } else node.first(id, cb)
    }
  }
  when(...caseSets) {
    let cases
    let tag
    this.walk(node=> {
      for (let i = 0; i < caseSets.length; i++) {
        cases = caseSets[i]
        if (node && node.id in cases) node = cases[node.id](node)
        if (node) {
          for (let n = 0; n < node.tags.length; n++) {
            tag = node.tags[n]
            tag = '$' + tag
            if (node && tag in cases) node = cases[tag](node)
          }
        }
      }
    })
  }
  tagged(tags, cb) {
    if (typeof(tags) == 'string') tags = tags.split(' ')
    let matched = []
    let node
    for (let i = 0; i < this.nodes.length; i++) {
      node = this.nodes[i]
      if (node.hasTag(...tags)) {
        matched.push(node)
        if (cb) cb(node)
      }
      const submatch = node.tagged(tags, cb)
      if (submatch.length) matched = matched.concat(submatch)
    }
    return matched
  }
  hasTag(...tags) {
    let has = false
    for (let i = 0; i < tags.length; i++) {
      if (this.tags.indexOf(tags[i]) >= 0) has = true
    }
    return has
  }
  expungeTagged(...tags) {
    const exs = this.syntax
    .filter(node=> (typeof(node) == 'string') || !node.hasTag(...tags))
    .map(node=> (typeof(node) == 'string') ? node : node.expungeTagged(...tags))
    return ast(this.id, ...exs).tag(...this.tags).attr(this.attrs)
  }
  mutate(opt) {
    const conf = {id: this.id, syntax: this.syntax, attrs: this.attrs, tags: this.tags}
    Object.assign(conf, opt)
    return this.parent.replace(this, new AST(conf))
  }
  replace(a, b) {
    b.parent = a.parent
    b.left = a.left
    b.right = a.right
    this.syntax.splice(this.syntax.indexOf(a), 1, b)
    this.nodes.splice(this.nodes.indexOf(a), 1, b)
    return b
  }
  excise(n) {
    this.syntax.splice(this.syntax.indexOf(n), 1)
    this.nodes.splice(this.nodes.indexOf(n), 1)
    if (n.left) n.left.right = n.right
    if (n.right) n.right.left = n.left
  }
  supplant(n=1) {
    const old = this.climb(n)
    return old.parent.replace(old, this)
  }

  climb(n=1) {
    if (!n) return this
    else return this.parent.climb(n-1)
  }

  // Composable methods

  attr(a, b) {
    if (typeof(a) == 'string') this.attrs[a] = b
    else Object.assign(this.attrs, a)
    return this
  }
  tag(...tags) {
    let tag
    for (let i = 0; i < tags.length; i += 1) {
      tag = tags[i]
      if (typeof(tag) == 'string') {
        if (tag.match(/ /g)) this.tag(...tag.split(' '))
        else if (!(tag in this.tags)) this.tags.push(tag)
      }
      else if (Array.isArray(tag)) this.tag(...tag)
      else throw new Error(`Invalid tag: '${tag}'`)
    }
    return this
  }
}

function ast(id, ...syntax) {
  return new AST({id, syntax})
}

function classification(to, name, ...tags) {
  if (!tags.length) tags = [name]
  name = name.toLowerCase()
  to[name] = (...args)=> ast(...args).tag(...tags)
  to[name].classify = (n, ...t)=> classification(to[name], n, ...t, ...tags)
  return to[name]
}

ast.classify = function(name, ...tags) {
  return classification(ast, name, ...tags)
}

module.exports = { AST, ast }
