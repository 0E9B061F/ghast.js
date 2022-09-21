// Simple INI Grammar
// Created as an example of ghast.js abstract syntax tree usage with peggy
// 0E9B061F <0E9B061F@protonmail.com>

{
  const ast = options.ast
}

Ini = g:Global s:Section* { return ast('Ini', g, s) }

Section = t:Tag Feed+ p:Pairs {
  return ast('Section', p).attr({name: t.attrs.name})
}
Global = p:Pairs { return ast('Global', p) }
Pairs = (Pair Feed*)*

Pair = WS* k:Ident WS* Assign WS* v:Value WS* {
  return ast('Pair', k, v).attr({key: k.image, val: v.image})
}
Tag = WS* LB WS* k:Ident WS* RB WS* {
  return ast('Tag', k).attr({name: k.image})
}

Ident = k:$[a-zA-Z0-9_-]+ { return ast('Ident', k) }
Value = v:$[^\n]+ { return ast('Value', v) }

Assign = "="
LB = "["
RB = "]"

WS = " "
Feed = "\n"
