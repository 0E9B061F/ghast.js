#!/usr/bin/env node
'use strict'

const repl = require('repl')
const { inspect } = require('util')
const parser = require('./parser.js')
const fs = require('fs')
const path = require('path')
const { ast } = require('../../lib/ghast.js')
const traversal = require('../../lib/traversal.js')
const trees = require('../../spec/trees.js')

const example = fs.readFileSync(path.join(__dirname, 'example.ab'), {encoding: 'utf-8'})

let context

const init =c=> {
  Object.assign(c, {
    ast,
    parser,
    example,
    tree: parser(example),
    trees,
    t1: trees.t1(),
    ...traversal,
  })
}

function result(raw) {
  return inspect(raw, {depth: 99, colors: true})
}

console.log('VARIABLES')
console.log('  ast: the ghast.js AST helper function. call to create nodes')
console.log('  parser: ab parser')
console.log('  example: example ab code')
console.log('  tree: ghast.js AST as returned by calling parser(example)')

const r = repl.start({prompt: 'AB> ', writer: result})
r.setupHistory(`${__dirname}/.repl-log`, (e,r)=> {})
init(r.context)

r.on('reset', init)
