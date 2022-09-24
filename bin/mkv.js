#!/usr/bin/env node
'use strict'

const { dirname } = require('path')
const { fileURLToPath } = require('url')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const child_process = require('child_process')

const pkg = require(`${__dirname}/../package.json`)
const series = require(`${__dirname}/../series.json`)

const ver = process.argv[2]
if (!ver || !ver.match(/^v\d+\.\d+\.\d+$/)) {
  console.log(`ERROR: '${ver}' is not a valid version`)
  process.exit(1)
}

const vinfo = child_process.execSync(`git --git-dir=${__dirname}/../.git tag -l "v*"`, {
  encoding: 'utf-8'
})
let vers = [...vinfo.split("\n").filter(v=> !!v), ver]
vers = [...new Set(vers.map(v=> v.split('.').slice(0,-1).join('.')))]
const name = series[vers.length-1]

const code = `${ver} '${name}'`
const line = `# 🏰 **ghast.js** ${code}`

let readme = readFileSync(`${__dirname}/../README.md`, {encoding: 'UTF-8'})
readme = readme.split('\n').slice(1)
readme = [line, ...readme]
writeFileSync(`${__dirname}/../README.md`, readme.join('\n'))
console.log(`updated README.md`)

pkg.version = ver.slice(1)
pkg.series = name

writeFileSync(`${__dirname}/../package.json`, JSON.stringify(pkg, null, 2))
console.log(`updated package.json`)

console.log(`updated to ${code}`)
console.log(`remember to \`git tag ${ver}\` after committing`)
