# 🏰 **ghast.js**
[![npm][icon-ver]][pkg]
[![license][icon-lic]][license]

**ghast.js** is an abstract syntax tree designed for use with peg.js/peggy.

# Usage

## Installation

```sh
npm install ghast.js
```

## The `ast` function

**ghast.js** provides the `AST` class and `ast` helper function:

```javascript
const { AST, ast } = require('ghast.js')
```

You probably won't need to interact with the `AST` class itself. The hellper is
a wrapper around `new AST()`. It takes an ID and zero-or-more syntax elements.
A syntax element may be a string, another AST node or an array of these.
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

## Using **ghast.js** in a Grammar File

To use **ghast** in a grammar file, create a parser and place the `ast` helper
function in the parser's options. For example:

```javascript
const peggy = require('peggy')
const { ast } = require('ghast.js')

const parser = peggy.generate(GRAMMAR)

const tree = parser.parse(INPUT, {ast})
```

The `ast` function will be available in your grammar:

```pegjs
{
  const ast = options.ast
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

The parser will now return a ghast AST which can be used to manipulate the
parsed syntax. This will remove all B elements below an A element:

```javascript
const tree = parser.parse(INPUT, {ast})
tree.each("A", a=> a.each({id: "B", depth: 0}, b=> b.remove()))
```

## API

Complete API documentation is coming. Below is an overview of the methods
available:

The `each` method is used to query the tree:

```javascript
node.each()                       // return all descendants of `node`
node.each({self: true})           // return `node` and all of its descendants
node.each('Section')              // return all descendants with id 'Section'
node.each({id: 'Section'})        // same as above
node.each({tag: 'val key'})       // return all descendants tagged 'val' or 'key'
node.each({id: 'A', first: true}) // return the first descendant with id 'A'
node.each({leaf: true})           // return all descendant leaf nodes
node.each({stem: true})           // return all non-leaf descendant nodes
node.each({depth: 0})             // return all direct children of `node`
node.each({depth: 1})             // return all direct children and grandchildren
node.each({up: true})             // return all ancestors of `node`
node.ancestor()                   // same as above
node.climb(3)                     // return nth ancestor of `node`
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
node.hasTag('bar baz')  // true if the node has any of the given tags
```

Nodes have attributes:

```javascript
node.attr('a', 100)         // set a single attribute
node.attr({foo: 1, bar: 2}) // set one or more attributes
node.attrs.foo              // accessing attributes
node.attrs['foo']           // accessing attributes
```

# Examples

Two examples are provided:

* [ab][ex-ab] - the nonsense example used in this README
* [ini][ex-ini] - a simplistic ini parser

# License

Available under the terms of the [MIT license.][license]

Copyright 2022 **[0E9B061F][gh]**


[gh]:https://github.com/0E9B061F
[license]:https://github.com/0E9B061F/ghast.js/blob/master/LICENSE
[pkg]:https://www.npmjs.com/package/ghast.js
[ex-ab]:https://github.com/0E9B061F/ghast.js/blob/master/example/ab
[ex-ini]:https://github.com/0E9B061F/ghast.js/blob/master/example/ini

[icon-ver]:https://img.shields.io/npm/v/ghast.js.svg?style=flat-square
[icon-lic]:https://img.shields.io/github/license/0E9B061F/ghast.js.svg?style=flat-square
