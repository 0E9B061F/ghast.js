{
  const ast = options.ast
}

Example = ex:Atom* { return ast('Example', ex) }

Atom = A / B / [ \n]

A = x:("a" Sub / "a") { return ast('A', x) }
B = x:("b" Sub / "b") { return ast('B', x) }

Sub = "(" Atom* ")"
