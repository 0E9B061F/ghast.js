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

function mkconf(conf, cb=null) {
  if (conf && typeof(conf) == 'string') {
    conf = {id: conf}
  }
  if (typeof(conf) == 'function') {
    conf = {cb: conf}
    cb = null
  }
  conf = Object.assign({
    depth: -1, self: false, first: false, last: false,
    id: null, tag: null,
    leaf: false, stem: false, root: false,
    cb, top: true,
    up: false,
  }, conf)
  if (typeof(conf.tag) == 'string') conf.tag = conf.tag.split(' ')
  return conf
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

  get [Symbol.toStringTag]() {
    const rm = this.isRoot ? '^' : ''
    const lm = this.isLeaf ? '>' : ''
    const sm = this.isStem ? '-' : ''
    const am = this.hasAttributes ? '=' : ''
    const as = Object.entries(this.attrs).map(p=> `${p[0]}:${p[1]}`).join(';')
    return `${rm}${sm}${lm}${this.hasTags ? this.tags.join('.')+'.' : ''}${this.id}${am}${as}`
  }

  //// Identity functions
  get isRoot() { return (!this.parent) }
  get isLeaf() { return (this.nodes.length < 1) }
  get isStem() { return !this.isRoot && !this.isLeaf }

  get hasTags() { return this.tags.length > 0 }
  get hasAttributes() { return Object.entries(this.attrs).length > 0 }

  // Returns true if the node has all of the given tags.
  hasTag(...tags) {
    let has = true
    for (let i = 0; i < tags.length; i++) {
      if (this.tags.indexOf(tags[i]) < 0) has = false
    }
    return has
  }

  // Return captured data
  get image() {
    return this.syntax.map(s=> typeof(s) == 'string' ? s : s.image).join('')
  }

  // Match against a query
  match(conf) {
    return (!conf.id || this.id == conf.id)
      && (!conf.tag || this.hasTag(...conf.tag))
      && (!conf.leaf || this.isLeaf)
      && (!conf.stem || this.isStem)
      && (!conf.root || this.isRoot)
  }

  //// Navigation

  // Return left and rightmost children
  get rightmostNode() { return this.nodes[this.nodes.length-1] || null }
  get leftmostNode() { return this.nodes[0] || null }

  // Return left and rightmost descendants
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

  // Return neighbors
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

  // String together multiple #each queries to create css-like selectors
  // `select('A', {tag: 'foo'}, {id: 'B', depth: 0})` is similar to the css
  // selector `A .foo > B`
  select(...confs) {
    const last = confs[confs.length - 1]
    let cb = null
    if (typeof(last) == 'function') {
      cb = last
      confs = confs.slice(0, -1)
    }
    const final = confs[confs.length - 1]
    let targets = [this]
    let conf
    let target
    let result
    for (let i = 0; i < confs.length; i++) {
      conf = confs[i]
      result = []
      for (let n = 0; n < targets.length; n++) {
        target = targets[n]
        const r = target.each(conf)
        if (r) result = [...new Set(result.concat(r))]
      }
      targets = result
    }
    if (cb) {
      for (let i = 0; i < result.length; i++) {
        cb(result[i])
      }
    } else return result
  }

  // If no callback is given, return every node with id in the tree.
  // If a callback is given it will be called with each node with id
  // as its first argument.
  // each('Ident')
  // each({tag: 'Foo'}, x=> x)
  // each({tag: 'Foo', depth: 2}, x=> x)
  // each({id: 'Value', depth: 0}, x=> x)
  each(conf={}, cb) {
    conf = mkconf(conf, cb)
    let matched = []
    let node
    if (conf.self) {
      if (this.match(conf)) matched.push(this)
      conf.self = false
    }
    if (!conf.first || !matched.length) {
      if (conf.up) {
        if (this.parent) {
          if (this.parent.match(conf)) matched.push(this.parent)
          if ((conf.depth < 0 || conf.depth > 0) && (!conf.first || !matched.length)) {
            const sub = this.parent.each({...conf, cb: null, depth: conf.depth - 1, top: false})
            if (sub?.length) matched = matched.concat(sub)
          }
        }
      } else {
        for (let i = 0; i < this.nodes.length; i++) {
          node = this.nodes[i]
          if (node.match(conf)) matched.push(node)
          if (conf.first && matched.length) {
            break
          } else {
            if (conf.depth < 0 || conf.depth > 0) {
              const submatch = node.each({...conf, cb: null, depth: conf.depth - 1, top: false})
              if (submatch?.length) {
                matched = matched.concat(submatch)
                if (conf.first) break
              }
            }
          }
        }
      }
    }
    if (conf.cb) {
      for (let i = 0; i < matched.length; i++) {
        conf.cb(matched[i])
      }
    }
    else if (conf.top && conf.first) return matched[0]
    else if (conf.top && conf.last) return matched[matched.length-1]
    else return matched
  }

  // Return the first descendant with the given id. If a callback is given
  // it will be called with the matched node as its first argument
  first(conf={}, cb) {
    conf = mkconf(conf, cb)
    conf.first = true
    return this.each(conf, cb)
  }

  // Return the first ancestor with the given id, or return null
  ancestor(conf={}, cb=null) {
    conf = mkconf(conf, cb)
    conf.up = true
    return this.each(conf, cb)
  }

  // Return the nth parent node
  climb(n=0, cb) {
    const conf = mkconf({up: true, last: true, depth: n}, cb)
    return this.each(conf, cb)
  }

  // Specify specific behavior for different nodes. The tree will be traversed
  // and the given cases executed whenever a node is matched, with the matched
  // node as the first argument to the case.
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

  // Replace a child node with node b
  // If only one argument is given, this node will be replaced by the given node
  replace(a, b) {
    let parent
    if (b) parent = this
    else {
      b = a
      a = this
      parent = this.parent
    }
    b.parent = a.parent
    b.left = a.left
    b.right = a.right
    parent.syntax.splice(parent.syntax.indexOf(a), 1, b)
    parent.nodes.splice(parent.nodes.indexOf(a), 1, b)
    return b
  }

  // Replace this node in-place with a new node. The new node will have the
  // properties given in opt. Any properties not specified will be left
  // unchanged.
  mutate(opt) {
    const conf = {id: this.id, syntax: this.syntax, attrs: this.attrs, tags: this.tags}
    Object.assign(conf, opt)
    return this.replace(new AST(conf))
  }

  // Remove a child node n
  // If n is not given, remove this node
  remove(n) {
    let parent
    if (n) parent = this
    else {
      parent = this.parent
      n = this
    }
    parent.syntax.splice(parent.syntax.indexOf(n), 1)
    parent.nodes.splice(parent.nodes.indexOf(n), 1)
    if (n.left) n.left.right = n.right
    if (n.right) n.right.left = n.left
  }

  //// Composable methods

  // Assign an attribute
  attr(a, b) {
    if (typeof(a) == 'string') this.attrs[a] = b
    else Object.assign(this.attrs, a)
    return this
  }

  // merge the attributes of this node with all of its child nodes,
  // and return the value of `k`
  read(k) {
    return Object.assign(...this.each({self: true}).map(x=> x.attrs))[k]
  }

  // Assign one or more tags
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

function classification(to, ...tags) {
  const c = (...args)=> ast(...args).tag(...tags)
  c.classify = (...t)=> classification(c, ...t, ...tags)
  return c
}

ast.classify = function(...tags) {
  return classification(ast, ...tags)
}

module.exports = { AST, ast }
