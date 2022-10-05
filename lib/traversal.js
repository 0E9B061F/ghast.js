'use strict'


const destr =(c)=> {
  return typeof(c) == 'string' ? {id: c} : c
}

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

class Visitor extends Array {
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
}


module.exports = { Visitor, Selector, Inquiry, Query, Traverse }
