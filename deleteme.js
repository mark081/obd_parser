function* logGenerator(greeting) {
    console.log(greeting);
    console.log(1, yield);
    console.log(2, yield);
    console.log(3, yield);
}

let gen = logGenerator('greeting');
let a = gen.next();
let b = gen.next('Hello');
let c = gen.next('Goodbye');

console.log('Finis');