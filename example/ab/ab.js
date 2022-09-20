#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const parser = require('./parser.js')


const args = process.argv.slice(2)
const inputPath = args[0] ? path.resolve(args[0]) : null
if (!inputPath) {
  console.log('ERROR: no path given')
  process.exit(1)
}
const input = fs.readFileSync(inputPath, {encoding: 'utf-8'})

const tree = parser(input)
console.log(tree)
