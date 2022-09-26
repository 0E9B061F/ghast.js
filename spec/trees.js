'use strict'

const { ast, AST } = require('../lib/ghast.js')

const t1 =()=> {
  const t = {}

  t.a6 = ast('F', 'f').tag('bar').attr('x1', 1)
  t.a5 = ast('E', 'e', t.a6)
  t.a4 = ast('D', 'd', t.a5).tag('baz')
  t.a3 = ast('C', 'c', t.a4)
  t.a2 = ast('B', 'b', t.a3).attr('x1', 2)
  t.a1 = ast('A', 'a', t.a2).tag('foo').attr('x1', 3)

  t.b7 = ast('V', 'v')
  t.b6 = ast('F', 'f', t.b7)
  t.b5 = ast('E', 'e', t.b6).tag('bar t2')
  t.b4 = ast('D', 'd', t.b5)
  t.b3 = ast('C', 'c', t.b4).attr('x2', 1)
  t.b2 = ast('B', 'b', t.b3).tag('baz')
  t.b1 = ast('A', 'a', t.b2)

  t.c6 = ast('V', 'v').attr('x2', 2)
  t.c5 = ast('U', 'u', t.c6)
  t.c4 = ast('T', 't', t.c5).tag('foo')
  t.c3 = ast('C', 'c', t.c4).tag('baz')
  t.c2 = ast('B', 'b', t.c3)
  t.c1 = ast('A', 'a', t.c2)

  t.d6 = ast('C', 'c')
  t.d5 = ast('B', 'b', t.d6).attr('x2', 3)
  t.d4 = ast('A', 'a', t.d5).tag('foo t1')
  t.d3 = ast('V', 'v', t.d4).tag('foo')
  t.d2 = ast('U', 'u', t.d3)
  t.d1 = ast('T', 't', t.d2).tag('baz t1')

  t.e4 = ast('T', 't').tag('bar t2').attr('x1', 100)
  t.e3 = ast('V', 'v', t.e4)
  t.e2 = ast('U', 'u', t.e3)
  t.e1 = ast('Z', 'z', t.e2).tag('foo')

  t.root = ast('Test', t.a1, t.b1, t.c1, t.d1, t.e1)
  return t
}


module.exports = { t1 }
