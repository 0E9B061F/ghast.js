'use strict'


const destr =(c)=> {
  return typeof(c) == 'string' ? {id: c} : c
}

/** A config object that a Query may be constructed from
 * @typedef {Object} QueryConf
 * @property {string} id - match against the id of the node
 * @property {string|string[]} tag - expect the node to have all the given tags
 * @property {boolean} leaf - match only leaves
 * @property {boolean} stem - match only stems
 * @property {boolean} root - match only root
 */

/** A literal that a Query may be constructed from.
 * Either a configuration object or a string representing a node id.
 * @typedef {(string|QueryConf)} QueryLit
 */

/** A Query object or QueryLiteral
 * @typedef {(Query|QueryLit)} QueryLike
 */

/** The Query class matches against the basic properties of a node
 * @constructor
 * @param {QueryLit} conf - a QueryConf object or a string representing a node id
 */
class Query {
  static make(conf) {
    return conf?.isQuery ? conf : new this(conf || {})
  }
  constructor(conf={}) {
    conf = destr(conf)
    Object.assign(this, {
      id: null,
      tag: null,
      leaf: false,
      stem: false,
      root: false,
    }, conf)
    if (typeof(this.tag) == 'string') this.tag = this.tag.split(' ')
  }
  get isQuery() { return true }

  // Match against a node
  match(node) {
    return (!this.id || node.id == this.id)
      && (!this.tag || node.hasTag(...this.tag))
      && (!this.leaf || node.isLeaf)
      && (!this.stem || node.isStem)
      && (!this.root || node.isRoot)
  }
}
 
/** A config object that a Traverse may be constructed from
 * @typedef {Object} TraverseConf
 * @property {string} id - match against the id of the node
 * @property {string|string[]} tag - expect the node to have all the given tags
 * @property {boolean} leaf - match only leaves
 * @property {boolean} stem - match only stems
 * @property {boolean} root - match only root
 * @property {number} depth - limit depth of traversal. a negative number means no limit
 * @property {boolean} self - include self in traversal
 * @property {boolean} first - stop traversal on first match and return it, or null if no match
 * @property {boolean} last - return only the last matched node, or null if no match
 * @property {boolean} up - traverse upwards through this nodes ancestors
 */

/** A literal that a Traverse may be constructed from.
 * Either a configuration object or a string representing a node id.
 * @typedef {(string|TraverseConf)} TraverseLit
 */

/** A Traverse object or TraverseLiteral
 * @typedef {(Traverse|TraverseLit)} TraverseLike
 */

/** The Traverse class matches against nodes according to configurable constraints
 * @constructor
 * @param {TraverseLit} conf - a TraverseConf object or a string representing a node id
 */
class Traverse extends Query {
  static make(conf) {
    return conf?.isTraverse ? conf : new this(conf || {})
  }
  constructor(conf={}) {
    conf = destr(conf)
    super(Object.assign({
      depth: -1,
      self: false,
      first: false,
      last: false,
      up: false,
      top: true,
    }, conf))
  }
  get isTraverse() { return true }

  next() {
    return new Traverse({...this, depth: this.depth - 1, top: false})
  }
}

class Inquiry {
  static make(...atoms) {
    if (atoms[0]?.isInquiry) return atoms[0]
    else return new this(...atoms)
  }
  constructor(...atoms) {
    const last = atoms[atoms.length-1]
    let cb = null
    if (typeof(last) == 'function') {
      cb = last
      atoms = atoms.slice(0,-1)
    }
    this.traverse = Traverse.make(atoms[0])
    this.cb = cb
  }
  get isInquiry() { return true }
}

class Selector extends Array {
  static make(...atoms) {
    if (atoms[0]?.isSelector) return atoms[0]
    else return new this(...atoms)
  }
  constructor(...atoms) {
    const last = atoms[atoms.length-1]
    let cb = null
    if (typeof(last) == 'function') {
      cb = last
      atoms = atoms.slice(0,-1)
    }
    atoms = atoms.map(c=> Traverse.make(c))
    if (!atoms.length) atoms = [Traverse.make()]
    super(...atoms)
    this.cb = cb
  }
  get isSelector() { return true }
}

/** A literal that a Visitor may be constructed from.
 * @typedef {Array<QueryLike|eachNode>} VisitorLit
 */

/** A Visitor object or VisitorLit
 * @typedef {(Visitor|VisitorLit)} VisitorLike
 */

/** A set of Query objects and a callback to be called on nodes that match them.
 * @constructor
 * @param {...QueryLike} query - one or more QueryLike objects to match against nodes
 * @param {eachNode} callback - called on nodes matching any of the visitor's queries
 */
class Visitor extends Array {
  static make(...atoms) {
    if (atoms[0]?.isVisitor) return atoms[0]
    else return new this(...atoms)
  }
  constructor(...atoms) {
    const last = atoms[atoms.length-1]
    let cb = null
    if (typeof(last) == 'function') {
      cb = last
      atoms = atoms.slice(0,-1)
    }
    atoms = atoms.map(c=> Query.make(c))
    if (!atoms.length) atoms = [Query.make()]
    super(...atoms)
    this.cb = cb
  }
  get isVisitor() { return true }
}


module.exports = { Visitor, Selector, Inquiry, Query, Traverse }
