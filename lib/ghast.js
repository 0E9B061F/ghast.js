'use strict'

const { Selector, Visitor, Inquiry } = require('./traversal.js')


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

// each('A', n=> n.foo)
// select('A', 'B', 'C', n=> n.foo)
// when(['A', 'B', n=> n.foo], ['X', n=> n.foo])



/**
 * The ghast abstract syntax tree.
 * @constructor
 * @param {object} opt          - Configuration object
 * @param {array}  opt.syntax   - syntax objects. may be strings, AST nodes or arrays of these
 * @param {object} opt.attrs    - attributes of this node, if any
 * @param {array}  opt.tags     - tags of this node, if any
 * @param {object} opt.location - location data
 */
class AST {
  constructor(opt) {
    const conf = {syntax: [], attrs: {}, tags: [], location: null}
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
    this.location = conf.location
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
  select(...atoms) {
    const selector = new Selector(...atoms)
    let targets = [this]
    let trv
    let target
    let result
    for (let i = 0; i < selector.length; i++) {
      trv = selector[i]
      result = []
      for (let n = 0; n < targets.length; n++) {
        target = targets[n]
        const r = target.each(trv)
        if (r) result = [...new Set(result.concat(r))]
      }
      targets = result
    }
    if (selector.cb) {
      for (let i = 0; i < result.length; i++) {
        selector.cb(result[i])
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
  each(...atoms) {
    const inq = Inquiry.make(...atoms)
    const trv = inq.traverse
    let matched = []
    let node
    if (trv.self && trv.top) {
      if (trv.match(this)) matched.push(this)
    }
    if (!trv.first || !matched.length) {
      if (trv.up) {
        if (this.parent) {
          if (trv.match(this.parent)) matched.push(this.parent)
          if ((trv.depth < 0 || trv.depth > 0) && (!trv.first || !matched.length)) {
            const sub = this.parent.each(trv.next())
            if (sub?.length) matched = matched.concat(sub)
          }
        }
      } else {
        for (let i = 0; i < this.nodes.length; i++) {
          node = this.nodes[i]
          if (trv.match(node)) matched.push(node)
          if (trv.first && matched.length) {
            break
          } else {
            if (trv.depth < 0 || trv.depth > 0) {
              const submatch = node.each(trv.next())
              if (submatch?.length) {
                matched = matched.concat(submatch)
                if (trv.first) break
              }
            }
          }
        }
      }
    }
    if (inq.cb) {
      for (let i = 0; i < matched.length; i++) {
        inq.cb(matched[i])
      }
    }
    else if (trv.top && trv.first) return matched[0]
    else if (trv.top && trv.last) return matched[matched.length-1]
    else return matched
  }

  // Return the first descendant with the given id. If a callback is given
  // it will be called with the matched node as its first argument
  first(...atoms) {
    const inq = Inquiry.make(...atoms)
    inq.traverse.first = true
    return this.each(inq)
  }

  // Return the first ancestor with the given id, or return null
  ancestor(...atoms) {
    const inq = Inquiry.make(...atoms)
    inq.traverse.up = true
    return this.each(inq)
  }

  // Return the nth parent node
  climb(n=0, cb) {
    const inq = Inquiry.make({up: true, last: true, depth: n}, cb)
    return this.each(inq)
  }

  // Match this node against multiple queries
  // Returns true if any match
  match(...query) {
    let m = false
    for (let i = 0; i < query.length; i++) {
      m = m || query[i].match(this)
    }
    return m
  }

  // Specify specific behavior for different nodes. The tree will be traversed
  // and the given cases executed whenever a node is matched, with the matched
  // node as the first argument to the case.
  when(...visitors) {
    visitors = visitors.map(v=> new Visitor(...v))
    let visitor
    this.each({self: true}, node=> {
      for (let i = 0; i < visitors.length; i++) {
        if (node.match(...visitors[i])) visitors[i].cb(node)
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

  loc(data) {
    this.location = data
    return this
  }
}

function classification(helper, ...tags) {
  const c = (...args)=> helper(...args).tag(...tags)
  c.classify = (...t)=> classification(c, ...t, ...tags)
  return c
}

const ast =(id, ...syntax)=> {
  return new AST({id, syntax})
}
ast.classify =(...tags)=> {
  return classification(ast, ...tags)
}
ast.locate =(loc)=> {
  const c = (...args)=> ast(...args).loc(loc())
  c.classify = (...t)=> classification(c, ...t)
  return c
}



module.exports = { AST, ast }
