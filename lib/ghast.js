'use strict'

const { Selector, Visitor, Inquiry, Query } = require('./traversal.js')


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

/** An AST node, string, or array of these
 * @typedef {(AST|string|Syntax)} SyntaxArg
 */

/** An array of AST nodes, strings, and arrays of these
 * @typedef {Array<SyntaxArg>} Syntax
 */

/** An array of strings or arrays of strings
 * @typedef {string|Array<Tags>} Tags
 */

/** A config object that an AST node may be constructed from
 * @typedef {Object} ASTConf
 * @property {Syntax} syntax   - syntax objects. may be strings, AST nodes or arrays of these
 * @property {object} attrs    - attributes of this node, if any
 * @property {Tags}   tags     - tags of this node, if any
 * @property {object} location - location data
 */


/** The ghast abstract syntax tree.
 * @constructor
 * @param {ASTConf} opt - an ASTConf object
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
  /** True if this node has no parent. */
  get isRoot() { return (!this.parent) }
  /** True if this node has no children. */
  get isLeaf() { return (this.nodes.length < 1) }
  /** True if this node is not a leaf or root. */
  get isStem() { return !this.isRoot && !this.isLeaf }

  /** True if this node has any tags. */
  get hasTags() { return this.tags.length > 0 }
  /** True if this node has any attributes. */
  get hasAttributes() { return Object.entries(this.attrs).length > 0 }

  /** Returns true if the node has all of the given tags.
   *  @param {...string} tags - zero or more tags to check
   *  @return {boolean}
   */
  hasTag(...tags) {
    let has = true
    for (let i = 0; i < tags.length; i++) {
      if (this.tags.indexOf(tags[i]) < 0) has = false
    }
    return has
  }

  /** Return captured syntax as a string. */
  get image() {
    return this.syntax.map(s=> typeof(s) == 'string' ? s : s.image).join('')
  }

  //// Navigation

  /** Return rightmost child node or null if this node has no children. */
  get rightmostNode() { return this.nodes[this.nodes.length-1] || null }
  /** Return leftmost child node or null if this node has no children. */
  get leftmostNode() { return this.nodes[0] || null }

  /** Return rightmost descendant node. If this node is a leaf it will return itself. */
  get rightmostLeaf() {
    if (this.isLeaf) return this
    if (this.rightmostNode.isLeaf) {
      return this.rightmostNode
    } else {
      return this.rightmostNode.rightmostLeaf
    }
  }
  /** Return leftmost descendant node. If this node is a leaf it will return itself. */
  get leftmostLeaf() {
    if (this.isLeaf) return this
    if (this.leftmostNode.isLeaf) {
      return this.leftmostNode
    } else {
      return this.leftmostNode.leftmostLeaf
    }
  }

  /** Return leftward sibling. If root, return self. */
  get goLeft() {
    if (this.isRoot) return this
    if (this.left) return this.left
    else return this.parent.goLeft.rightmostLeaf
  }
  /** Return rightward sibling. If root, return self. */
  get goRight() {
    if (this.isRoot) return this
    if (this.right) return this.right
    else return this.parent.goRight.leftmostLeaf
  }
  /** Return parent. If root, return self. */
  get goUp() {
    if (this.isRoot) return this
    else return this.parent
  }
  /** Return first (leftmost) child. If this node is a leaf, return self. */
  get goDown() {
    if (this.isLeaf) return this
    else return this.leftmostNode
  }

  /** Called with each returned node.
   * @callback eachNode
   * @param {AST} node
   */

  /** An array of nodes, or a single node which may be null
   * @typedef {(AST[]|?AST)} Nodes
   */

  /** Perform selections on the tree from a sequence of traversals. Returns the
   * selected nodes if no callback is given.
   * @param {...TraverseLike} [traverse] - Zero-or-more Traverse literals
   * @param {eachNode} [callback] - A function to be called on each selected node
   * @return {AST[]} An array of any AST nodes that were selected
   * @example
   * // similar to the css selector `A .foo > B`
   * node.select('A', {tag: 'foo'}, {id: 'B', depth: 0})
   */
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
    }
    return result
  }

  /** Perform a single traversal of the tree.
   * @param {TraverseLike} [traverse] - A Traverse literal
   * @param {eachNode} [callback] - A function to be called on each selected node
   * @return {Nodes} An array of selected nodes, or a single node if `first` or `last` are specified.
   * Returns `null` if `first` or `last` are specified and nothing was selected. 
   * @example
   * node.each()                       // return all descendants of `node`
   * node.each({self: true})           // return `node` and all of its descendants
   * node.each('Section')              // return all descendants with id `Section`
   */
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
    if (trv.top && trv.first) return matched[0]
    else if (trv.top && trv.last) return matched[matched.length-1]
    else return matched
  }

  /** Return the first descendant selected by the given traverse. Same as calling
   * `each` with `first` specified.
   * @param {TraverseLike} [traverse] - A Traverse literal
   * @param {eachNode} [callback] - A function to be called on the selected node, if any
   * @return {?AST} The selected node or `null` if nothing was selected
   * @example
   * // select first 'A' node
   * node.first('A')
   * // same as above
   * node.each({id: 'A', first: true})
   */
  first(...atoms) {
    const inq = Inquiry.make(...atoms)
    inq.traverse.first = true
    return this.each(inq)
  }

  /** Traverse this nodes ancestors. Same as calling `each` with `up` specified.
   * @param {TraverseLike} [traverse] - A Traverse literal
   * @param {eachNode} [callback] - A function to be called on the selected node, if any
   * @return {Nodes} An array of selected nodes, or a single node if `first` or `last` are specified.
   * Returns `null` if `first` or `last` are specified and nothing was selected. 
   * @example
   * // select any 'A' ancestors
   * node.ancestor('A')
   * // same as above
   * node.each({id: 'A', up: true})
   */
  ancestor(...atoms) {
    const inq = Inquiry.make(...atoms)
    inq.traverse.up = true
    return this.each(inq)
  }

  /** Return the nth parent node.
   * @param {number} [n=0] - ancestor to select
   * @param {eachNode} [callback] - A function to be called on the selected node, if any
   * @return {?AST} The selected node or `null` if nothing was selected
   * @example
   * // return third ancestor
   * node.climb(2)
   * // same as above
   * node.each({up: true, last: true, depth: 2})
   */
  climb(n=0, cb) {
    const inq = Inquiry.make({up: true, last: true, depth: n}, cb)
    return this.each(inq)
  }

  /** Match this node against multiple queries
   * @param {...QueryLike} query - one or more QueryLikes to match against
   * @return {boolean} Returns true if any of the queries match
   */
  match(...query) {
    let m = false
    for (let i = 0; i < query.length; i++) {
      m = m || Query.make(query[i]).match(this)
    }
    return m
  }

  /** Walk the tree and match each node against the given visitors. When a visitor matches
   * a node its callback is called with the node. Multiple visitors may match each node.
   * @param {...VisitorLike} visitors - One-or-more Visitor literals, or Visitor objects
   * @example
   * node.when(
   *   ['A', 'B', n=> n.foo()],
   *   [{id: 'C', tag: 'x y'}, {tag: 'c'}, n=> n.bar()],
   *   [{id: 'Y', leaf: true}, {id: 'Z', leaf: true}, n=> n.baz()],
   * )
   */
  when(...visitors) {
    visitors = visitors.map(v=> new Visitor(...v))
    let visitor
    this.each({self: true}, node=> {
      for (let i = 0; i < visitors.length; i++) {
        if (node.match(...visitors[i])) visitors[i].cb(node)
      }
    })
  }

  /** Replace child node `a` with node `b`
   * If `b` is not given, replace self with `a`
   * @param {AST} a - the child node to replaced, or the node to replace self with
   * @param {AST} [b] - the node to replace child node `a` with
   * @return {AST} Returns the replacement node
   */
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

  /** Mutate this node in place, replacing any of its properties
   * with those specified in the config object
   * @param {ASTConf} opt - an ASTConf object
   * @return {AST} Returns the new replacement node
   */
  mutate(opt) {
    const conf = {id: this.id, syntax: this.syntax, attrs: this.attrs, tags: this.tags}
    Object.assign(conf, opt)
    return this.replace(new AST(conf))
  }

  /** Remove a child node n. If n is not given, remove this node.
   * with those specified in the config object
   * @param {AST} [n] - an AST node
   */
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

  /** Assign an attribute
   * @param {string|Object} a - the key to assign, or an object to merge with the nodes attributes
   * @param {*} b - the value to assign to key `a`
   * @return {ast} Returns this node 
   */
  attr(a, b) {
    if (typeof(a) == 'string') this.attrs[a] = b
    else Object.assign(this.attrs, a)
    return this
  }

  /** Merge the attributes of this node with all of its descendant nodes,
   * and return the value of `k`
   * @param {string} k - the key to read
   * @return {*} The value of `k`
   */
  read(k) {
    return Object.assign(...this.each({self: true}).map(x=> x.attrs))[k]
  }

  /** Assign one or more tags
   * @param {Tags} tags - one or more tags to assign
   * @return {AST} Returns this node 
   */
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

  /** Set location data for this node
   * @param {Object} data - location data to be assigned
   * @return {AST} Returns this node 
   */
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

/** A simple wrapper around AST#new. Creates a node from an id and
 * zero-or-more syntax items.
 * @param {string} id - the id of the new node
 * @param {...SyntaxArg} [syntax] - the id of the new node
 * @return {AST} The created node 
 */
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
