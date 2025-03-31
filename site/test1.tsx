import { asdf } from "./foo/test2.jsx"

export const foo: number = 1234
console.log('in test1.tsx', foo, <foo />, asdf)

function Sauce(name: string) {
  return (constructor: Function) => {
    constructor.prototype.sauce = name
  }
}

@Sauce('pizza')
class Foo {

}

const foo2 = new Foo()
console.log(foo2.sauce)

