A simplistic ini parser created as an example of **ghast.js** usage.

Parses pairs and understands sections but that's about it. Doesn't support comments.

Returns an object that looks like this:

```
{
  global: { foo: 'bar', baz: 'bat' },
  sections: { config: { hello: '50', world: '100' }, user: { one: 'more' } }
}
```
