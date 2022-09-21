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
parsed syntax:

```javascript
const tree = parser.parse(input, {ast})
tree.each("A", a=> a.each({id: "B", depth: 0}, b=> b.remove()))
```

This will remove all B elements below an A element (but leaves top-level B elements intact).
