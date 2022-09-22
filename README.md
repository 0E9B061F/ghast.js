# <p align="center">🏰</p>

**ghast.js** is an abstract syntax tree designed for use with peg.js/peggy.

# Usage

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
// transform nodes in-place:
node.mutate({id: 'Foo', attrs: {x: 1}})
node.mutate({tags: 'x y z', syntax: ['foo']})

// replace a child node with another:
node.replace(node.first(), ast('Test', 'test'))
// self-replace a node with another:
node.replace(ast('Test', 'test'))

// remove a child node:
node.remove(node.first())
// self-remove a node:
node.remove()

// replace the parent node with self:
node.supplant()
// replace the nth parent node with self:
node.supplant(2)
```
