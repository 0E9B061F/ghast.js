#!/usr/bin/env node
'use strict'

const repl = require('repl')
const { inspect } = require('util')
const parser = require('./parser.js')
const fs = require('fs')
const path = require('path')
const example = fs.readFileSync(path.join(__dirname, 'example.ini'), {encoding: 'utf-8'})

let context

const init =c=> {
  Object.assign(c, {
    parser,
    example,
    tree: parser(example),
  })
}

function result(raw) {
  return inspect(raw, {depth: 99, colors: true})
}

console.log('VARIABLES')
console.log('  parser: Simple Ini parser')
console.log('  example: string containing an example ini file')
console.log('  tree: ghast.js AST as returned by calling parser(example)')

const r = repl.start({prompt: 'SINI> ', writer: result})
r.setupHistory(`${__dirname}/.repl-log`, (e,r)=> {})
init(r.context)

r.on('reset', init)
