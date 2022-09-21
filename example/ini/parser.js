'use strict'

const fs = require('fs')
const path = require('path')
const peggy = require('peggy')
const { AST, ast } = require('../../lib/ghast.js')

const grammarPath = path.join(__dirname, 'ini.pegjs')
const grammar = fs.readFileSync(grammarPath, {encoding: 'utf-8'})
const parser = peggy.generate(grammar)

const parse = (input)=> parser.parse(input, {ast})

module.exports = {
  raw: (input)=> parse(input),
  parse: (input)=> {
    const tree = parse(input)
    const ini = {
      global: {},
      sections: {},
    }
    tree.first('Global').each('Pair', p=> {
      ini.global[p.attrs.key] = p.attrs.val
    })
    tree.each('Section', s=> {
      const o = {}
      s.each('Pair', p=> {
        o[p.attrs.key] = p.attrs.val
      })
      ini.sections[s.attrs.name] = o
    })
    return ini
  }
}
