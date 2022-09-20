'use strict'

const fs = require('fs')
const path = require('path')
const peggy = require('peggy')
const { AST, ast } = require('../../lib/ghast.js')

const grammarPath = path.join(__dirname, 'ab.pegjs')
const grammar = fs.readFileSync(grammarPath, {encoding: 'utf-8'})
const parser = peggy.generate(grammar)

module.exports = (input)=> {
  const tree = parser.parse(input, {ast})
  return tree
}
