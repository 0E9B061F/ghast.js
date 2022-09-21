**ghast.js** is an abstract syntax tree designed for use with peg.js/peggy.

# Usage

To use **ghast** in a grammar file, create a parser and place the `ast` helper
function in the parser's options. For example:

```javascript
const peggy = require('peggy')
const { ast } = require('ghast.js')

const parser = peggy.generate(GRAMMAR)

const tree = parser.parse(input, {ast})
```

The `ast` function will be available in your grammar:

```pegjs
{
  const ast = options.ast
}

Example = ex:Atom* { return ast('Example', ex) }

Atom = A / B / [ \n]

A = x:("a" Sub / "a") { return ast('A', x) }
B = x:("b" Sub / "b") { return ast('B', x) }

Sub = "(" Atom* ")"
```

The parser will now return a ghast AST which can be used to manipulate the
parsed syntax:

```javascript
const tree = parser.parse(input, {ast})
tree.each('A', a=> a.each('B', b=> a.excise(b)))
```

This will remove all B elements below an A element (but leaves top-level B elements intact).
