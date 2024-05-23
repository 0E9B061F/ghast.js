# 🏰 **ghast.js** v0.6.5 'FLAY'
[![Version][icon-ver]][repo]
[![Series][icon-ser]][gh]
[![License][icon-lic]][license]
[![Documentation][icon-doc]][docs]<br/>
[![NPM][icon-npm]][pkg]

**ghast.js** is an abstract syntax tree designed for use with
[Peggy][peggy]/[PEG.js][pegjs].

# Usage

## Installation

```sh
npm install ghast.js
```

## The `ast` function

**ghast.js** provides the [`AST`][doc-AST] class and [`ast`][doc-helper] helper function:

```javascript
const { AST, ast } = require('ghast.js')
```

You probably won't need to interact with the [`AST`][doc-AST] class itself. The helper is
a wrapper around `new AST()`. It takes an ID and zero-or-more syntax elements.
A syntax element may be a string, another [`AST`][doc-AST] node or an array of these.
Example:

```javascript
ast('Function',
  ast('Ident', 'foo'),
  "(", ast('String', '"', 'bar', '"'), ")"
)
```

This will return a small tree representing a call to function `foo` with one
string as its argument, `"bar"`.

### The `classify` function

The `ast.classify` function takes a number of tags and returns a new helper
function that automatically applies these tags to created nodes. For example:

```javascript
const foo = ast.classify('foo')
const n1 = foo('Int', '55') // n1 will have the tag 'foo'

const bar = foo.classify('bar')
const n2 = bar('Str', 'foo') // n2 will be tagged 'foo bar'
```

### The `locate` function

`ast.locate` takes a location function and returns a new helper
function that automatically adds location data to any created nodes. In a
grammar you would use it like this:

```pegjs
{
  const ast = options.ast.locate(location)
}
```

Any created nodes will capture location data from the rule where they're
created, available as `node.location`. Note that all nodes created in an action
will share the same location information; to get information on a portion of the
match, create another rule for just that portion.

## Using **ghast.js** in a Grammar File

To use **ghast** in a grammar file, create a parser and place the [`ast`][doc-helper] helper
function in the parser's options. For example:

```javascript
const peggy = require('peggy')
const { ast } = require('ghast.js')

const parser = peggy.generate(GRAMMAR)

const tree = parser.parse(INPUT, {ast})
```

The [`ast`][doc-helper] function will be available in your grammar:

```pegjs
{
  const ast = options.ast.locate(location)
  const node = ast.classify('Node')
  const val = ast.classify('Value')
}

Example = ex:Atom* { return ast('Example', ex) }

Atom = A / B / N / S / [ \n]
Sub = "(" Atom* ")"

A = x:("a" Sub / "a") { return node('A', x) }
B = x:("b" Sub / "b") { return node('B', x) }
N = n:$[0-9]+ { return val('Number', n) }
S = "'" C "'"
C = c:$[^']+ { return val('String', c) }
```

The parser will now return a **ghast** [`AST`][doc-AST] which can be used to manipulate the
parsed syntax. This will remove all B elements directly below an A element:

```javascript
const tree = parser.parse(INPUT, {ast})
tree.select("A", {id: "B", depth: 0}, b=> b.remove())
```

## API

[Complete API documentation][docs] is available. Below is an overview of common methods:

The [`each`][doc-each] method is used to query the tree:

```javascript
node.each()                       // return all descendants of `node`
node.each({self: true})           // return `node` and all of its descendants
node.each('Section')              // return all descendants with id `Section`
node.each({id: 'Section'})        // same as above
node.each({id: 'X', tag: 'y'})    // return all descendants with both id `X` and tag `y`
node.each({tag: 'val key'})       // return all descendants tagged `val` and `key`
node.each({id: 'A', first: true}) // return the first descendant with id `A`
node.each({leaf: true})           // return all descendant leaf nodes
node.each({stem: true})           // return all non-leaf descendant nodes
node.each({depth: 0})             // return all direct children of `node`
node.each({depth: 1})             // return all direct children and grandchildren
node.each({up: true})             // return all ancestors of `node`
node.ancestor()                   // same as above
node.each({up: true, tag: 'x'})   // return all ancestors of `node` tagged `x`
node.ancestor({tag: 'x'})         // same as above
node.climb(3)                     // return nth ancestor of `node`
```

The [`select`][doc-select] method creates complex selections from multiple [traverses][doc-trv],
similar to CSS selectors. The following is similar to `A .foo > B`:

```javascript
node.select('A', {tag: 'foo'}, {id: 'B', depth: 0})
```

The [`when`][doc-when] method is used to visit nodes. Each visitor is an array of
queries followed by a callback which will be called for each node
matching any of its associated queries:

```javascript
node.when(
  [{id: 'A', tag: 'foo'}, n=> n.foo()],
  ['T', 'V', n=> n.bar()],
  [{tag: 'bar'}, {leaf: true}, n=> n.baz()],
)
```

The following methods exist to modify the tree:

```javascript
// replace a child node with another:
node.replace(node.first(), ast('Test', 'test'))
// self-replace a node with another:
node.replace(ast('Test', 'test'))

// transform nodes in-place:
node.mutate({id: 'Foo', attrs: {x: 1}})
node.mutate({tags: 'x y z', syntax: ['foo']})

// remove a child node:
node.remove(node.first())
// self-remove a node:
node.remove()
```

Nodes can be tagged:

```javascript
node.tag('foo')         // tag a node
node.tag('foo bar baz') // apply multiple tags at once
node.hasTags            // true if the node has any tags
node.hasTag('foo')      // true if the node has the tag `foo`
node.hasTag('bar baz')  // true if the node has all of the given tags
```

Nodes have attributes:

```javascript
node.attr('a', 100)         // set a single attribute
node.attr({foo: 1, bar: 2}) // set one or more attributes
node.attrs.foo              // accessing attributes
node.attrs['foo']           // accessing attributes
```

The [`read`][doc-read] method deep-reads attributes; it merges the attributes of this node
with all of its descendants and returns the value of the given property:

```javascript
const node = ast('Function',
  ast('Ident', 'foo').attr('foo', 1),
  "(", ast('String', '"', 'bar', '"').attr('bar', 2), ")"
)
node.read('foo') // returns 1
node.read('bar') // returns 2
```

Location data for a node can be set with [`loc`][doc-loc]:

```javascript
node.loc({start: 1, end: 2})
node.location // read set location data
```

# Examples

Two examples are provided:

* **[ab][ex-ab]** - the nonsense example used in this README
* **[ini][ex-ini]** - a simplistic ini parser

# License

Available under the terms of the [MIT license.][license]

Copyright 2023 **[0E9B061F][gh]**


[gh]:https://github.com/0E9B061F
[repo]:https://github.com/0E9B061F/ghast.js
[license]:https://github.com/0E9B061F/ghast.js/blob/master/LICENSE
[pkg]:https://www.npmjs.com/package/ghast.js
[ex-ab]:https://github.com/0E9B061F/ghast.js/blob/master/example/ab
[ex-ini]:https://github.com/0E9B061F/ghast.js/blob/master/example/ini
[docs]:https://0e9b061f.github.io/docs/ghast.js

[doc-AST]:https://0e9b061f.github.io/docs/ghast.js/AST.html
[doc-helper]:https://0e9b061f.github.io/docs/ghast.js/global.html#ast
[doc-each]:https://0e9b061f.github.io/docs/ghast.js/AST.html#each
[doc-select]:https://0e9b061f.github.io/docs/ghast.js/AST.html#select
[doc-when]:https://0e9b061f.github.io/docs/ghast.js/AST.html#when
[doc-read]:https://0e9b061f.github.io/docs/ghast.js/AST.html#read
[doc-loc]:https://0e9b061f.github.io/docs/ghast.js/AST.html#loc
[doc-trv]:https://0e9b061f.github.io/docs/ghast.js/Traverse.html

[peggy]:https://github.com/peggyjs/peggy
[pegjs]:https://github.com/pegjs/pegjs

[icon-ver]:https://img.shields.io/github/package-json/v/0E9B061F/ghast.js.svg?style=flat-square&logo=github&color=%236e7fd2
[icon-ser]:https://img.shields.io/badge/dynamic/json?color=%236e7fd2&label=series&prefix=%27&query=series&suffix=%27&url=https%3A%2F%2Fraw.githubusercontent.com%2F0E9B061F%2Fghast.js%2Fmaster%2Fpackage.json&style=flat-square
[icon-lic]:https://img.shields.io/github/license/0E9B061F/ghast.js.svg?style=flat-square&color=%236e7fd2
[icon-doc]:https://img.shields.io/badge/dynamic/json?color=%236e7fd2&label=docs&prefix=v&query=version&url=https%3A%2F%2F0e9b061f.github.io%2Fdocs%2Fghast.js%2Fpackage.json
[icon-npm]:https://img.shields.io/npm/v/ghast.js.svg?style=flat-square&logo=npm&color=%23de2657
