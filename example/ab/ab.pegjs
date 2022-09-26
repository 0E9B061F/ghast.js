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
