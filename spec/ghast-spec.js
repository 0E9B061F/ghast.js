'use strict'
const trees = require('./trees.js')
const { ast, AST } = require('../lib/ghast.js')
const parser = require('../example/ab/parser.js')

const data = 'a complete sentence. a parting remark.'

const s1n1 = ast('Word', 'a').attr({name: 's1n1'})
const s1n2 = ast('Space', ' ').tag('Whitespace').attr({name: 's1n2'})
const s1n3 = ast('Word', 'complete').attr({name: 's1n3'})
const s1n4 = ast('Space', ' ').tag('Whitespace').attr({name: 's1n4'})
const s1n5 = ast('Word', 'sentence').attr({name: 's1n5'})
const s1n6 = ast('Period', '.').tag('Punctuation').attr({name: 's1n6'})
const p1s1 = ast('Sentence', s1n1,s1n2,s1n3,s1n4,s1n5,s1n6).attr({name: 'p1s1'})

const p1n1 = ast('Space', ' ').tag('Whitespace').attr({name: 'p1n1'})

const s2n1 = ast('Word', 'a').attr({name: 's2n1'})
const s2n2 = ast('Space', ' ').tag('Whitespace').attr({name: 's2n2'})
const s2n3 = ast('Word', 'parting').attr({name: 's2n3'})
const s2n4 = ast('Space', ' ').tag('Whitespace').attr({name: 's2n4'})
const s2n5 = ast('Word', 'remark').attr({name: 's2n5'})
const s2n6 = ast('Period', '.').tag('Punctuation').attr({name: 's2n6'})
const p1s2 = ast('Sentence', s2n1,s2n2,s2n3,s2n4,s2n5,s2n6).attr({name: 'p1s2'})

const tree = ast('Paragraph', p1s1,p1n1,p1s2).attr({name: 'tree'})

describe("ghast.js", function() {
  it("creates a node", function() {
    expect(ast("Test", 'x')).toBeInstanceOf(AST)
  })
  it("has a root", function() {
    const a = ast("Test", 'x')
    expect(a.isRoot).toBe(true)
    const b = ast("Test", a)
    expect(b.isRoot).toBe(true)
    expect(a.isRoot).toBe(false)
  })
  it("has leaves", function() {
    const a = ast("Test", 'x')
    expect(a.isLeaf).toBe(true)
    const b = ast("Test", a)
    expect(b.isRoot).toBe(true)
    expect(b.isLeaf).toBe(false)
    expect(a.isRoot).toBe(false)
    expect(a.isLeaf).toBe(true)
  })
  it("captures its input", function() {
    expect(tree.image).toEqual(data)
  })
  it("is navigable", function() {
    expect(tree.leftmostNode).toBe(p1s1)
    expect(tree.rightmostNode).toBe(p1s2)

    expect(tree.leftmostLeaf).toBe(s1n1)
    expect(tree.rightmostLeaf).toBe(s2n6)

    expect(p1s1.leftmostNode).toBe(s1n1)
    expect(p1s1.rightmostNode).toBe(s1n6)

    expect(p1s1.leftmostLeaf).toBe(s1n1)
    expect(p1s1.rightmostLeaf).toBe(s1n6)

    expect(tree.goLeft).toBe(tree)
    expect(tree.goRight).toBe(tree)
    expect(tree.goUp).toBe(tree)
    expect(tree.goDown).toBe(p1s1)

    expect(p1s1.goLeft).toBe(s2n6)
    expect(p1s1.goRight).toBe(p1n1)
    expect(p1s1.goUp).toBe(tree)
    expect(p1s1.goDown).toBe(s1n1)

    expect(s2n6.goLeft).toBe(s2n5)
    expect(s2n6.goRight).toBe(s1n1)
    expect(s2n6.goUp).toBe(p1s2)
    expect(s2n6.goDown).toBe(s2n6)
  })
  it("is queryable", function() {
    const t = trees.t1()
    expect(t.root.each({leaf: true})).toEqual([t.a6, t.b7, t.c6, t.d6, t.e4])
    expect(t.root.each({id: 'T', first: true})).toEqual(t.c4)
    expect(t.root.each({id: 'Z', first: true})).toEqual(t.e1)
    expect(t.root.each({id: 'T'}).length).toEqual(3)
    expect(t.root.each({id: 'A'}).length).toEqual(4)
    expect(t.root.each({id: 'A', depth: 0}).length).toEqual(3)
    expect(t.root.each({id: 'A', depth: 1}).length).toEqual(3)
    expect(t.root.each({id: 'A', depth: 2}).length).toEqual(3)
    expect(t.root.each({id: 'A', depth: 3}).length).toEqual(4)
    expect(t.root.each({id: 'T', first: true}).each()).toEqual([t.c5, t.c6])
    expect(t.root.each({id: 'T', first: true}).each({self: true})).toEqual([t.c4, t.c5, t.c6])
    expect(t.root.each({tag: 'foo'})).toEqual([t.a1, t.c4, t.d3, t.d4, t.e1])
    expect(t.root.each({tag: 'bar'})).toEqual([t.a6, t.b5, t.e4])
    expect(t.root.each({tag: 't2 bar'})).toEqual([t.b5, t.e4])
    expect(t.root.each({id: 'T', tag: 'foo'})).toEqual([t.c4])
  })
  it("its ancestors are queryable", function() {
    const t = trees.t1()
    const rm = t.root.rightmostLeaf
    expect(rm.each({up: true})).toEqual([t.e3, t.e2, t.e1, t.root])
    expect(rm.ancestor()).toEqual([t.e3, t.e2, t.e1, t.root])
    expect(rm.each({up: true, stem: true})).toEqual([t.e3, t.e2, t.e1])
    expect(rm.each({up: true, self: true})).toEqual([t.e4, t.e3, t.e2, t.e1, t.root])
    expect(rm.each({up: true, depth: 1})).toEqual([t.e3, t.e2])
    expect(rm.each({up: true, tag: 'foo'})).toEqual([t.e1])
    expect(rm.each({up: true, id: 'U', first: true})).toEqual(t.e2)
    expect(rm.each({up: true, last: true, depth: 2})).toEqual(t.e1)
    expect(rm.climb(2)).toEqual(t.e1)
  })
  it("supports complex selections", function() {
    const t = trees.t1()
    expect(t.root.select({id: 'T', tag: 'foo'}, 'V')).toEqual([t.c6])
    expect(t.root.select('A', 'V')).toEqual([t.b7, t.c6])
    expect(t.root.select({tag: 'foo'}, 'C')).toEqual([t.a3, t.d6])
    expect(t.root.select('T', {tag: 'foo'}, 'C')).toEqual([t.d6])
  })
  it("is mutatable", function() {
    const t = trees.t1()
    const rm = t.root.rightmostLeaf
    const n = rm.mutate({id: 'FOO', tags: 'x y b', syntax: ['foo'], attrs: {x: 1}})
    expect(t.root.rightmostLeaf).toEqual(n)
    expect(t.root.rightmostLeaf.id).toEqual('FOO')
    expect(t.root.rightmostLeaf.tags).toEqual(['x', 'y', 'b'])
    expect(t.root.rightmostLeaf.syntax).toEqual(['foo'])
    expect(t.root.rightmostLeaf.attrs).toEqual({x: 1})
  })
  it("is removable", function() {
    const t = trees.t1()
    expect(t.root.rightmostLeaf.id).toEqual('T')
    t.root.rightmostLeaf.remove()
    expect(t.root.rightmostLeaf.id).toEqual('V')
    t.root.remove(t.root.rightmostNode)
    expect(t.root.rightmostLeaf.id).toEqual('C')
  })
  it("is replaceable", function() {
    const t = trees.t1()
    t.root.replace(t.root.rightmostNode, t.root.first())
    expect(t.root.rightmostLeaf.id).toEqual('F')
    t.root.rightmostLeaf.replace(ast('XXX'))
    expect(t.root.rightmostLeaf.id).toEqual('XXX')
  })
  it("it has tags", function() {
    const t = trees.t1()
    expect(t.root.hasTags).toBe(false)
    expect(t.a1.hasTags).toBe(true)
    expect(t.root.hasTag('xxx')).toBe(false)
    expect(t.a1.hasTag('foo')).toBe(true)
    expect(t.a1.hasTag('a')).toBe(false)
    expect(t.d6.hasTags).toBe(false)
    t.d6.tag('TEST')
    expect(t.d6.hasTags).toBe(true)
    expect(t.e3.hasTags).toBe(false)
    t.e3.tag('T1 T2 T3')
    expect(t.e3.hasTags).toBe(true)
    expect(t.e3.hasTag('T1')).toBe(true)
    expect(t.e3.hasTag('T2', 'T3')).toBe(true)
    expect(t.e3.hasTag('T1', 'T2', 'T3')).toBe(true)
    expect(t.d1.hasTag('baz', 't1')).toBe(true)
    expect(t.d1.hasTag('baz', 't1', 'x')).toBe(false)
    expect(t.d1.hasTag('t1')).toBe(true)
  })
  it("it has attributes", function() {
    const t = trees.t1()
    expect(t.root.hasAttributes).toBe(false)
    expect(t.a6.hasAttributes).toBe(true)
    expect(t.a6.attrs.x1).toBe(1)
    t.a6.attr('x1', 100)
    expect(t.a6.attrs.x1).toBe(100)
    t.a6.attr('z', 'foo')
    expect(t.a6.attrs.z).toBe('foo')
  })
  it("it can deep-read attributes", function() {
    const t = trees.t1()
    expect(t.root.hasAttributes).toBe(false)
    expect(t.root.read('x1')).toBe(100)
    expect(t.a1.read('x1')).toBe(1)
    expect(t.root.read('x2')).toBe(3)
  })
  it("it captures location data", function() {
    let t = parser("a(b(77) b('foo bar baz'))\n424242 a(\n1 2 3\n)")
    t = t.each().map(x=> [x.location.start.offset, x.location.end.offset])
    expect(t).toEqual([
      [0,25],  [2,7],   [4,6],
      [8,24],  [11,22], [26,32],
      [33,43], [36,37], [38,39],
      [40,41]
    ])
  })
  it("it supports visitors", function() {
    const t = trees.t1()
    const a1 = []
    const a2 = []
    const a3 = []
    t.root.when(
      [{id: 'A', tag: 'foo'}, n=> a1.push(n)],
      ['T', 'V', n=> a2.push(n)],
      [{tag: 'bar'}, {leaf: true}, n=> a3.push(n)],
    )
    expect(a1).toEqual([t.a1, t.d4])
    expect(a2).toEqual([t.b7, t.c4, t.c6, t.d1, t.d3, t.e3, t.e4])
    expect(a3).toEqual([t.a6, t.b5, t.b7, t.c6, t.d6, t.e4])
  })
})
