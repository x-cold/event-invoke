# event-invoke

[![version](https://img.shields.io/npm/v/event-invoke.svg)](https://www.npmjs.com/package/event-invoke)
[![downloads](https://img.shields.io/npm/dt/event-invoke.svg)](https://www.npmjs.com/package/event-invoke)
[![license](https://img.shields.io/npm/l/event-invoke.svg)](https://github.com/x-cold/event-invoke/blob/master/LICENSE)
[![Travis](https://img.shields.io/travis/x-cold/event-invoke.svg)](https://travis-ci.org/x-cold/event-invoke)
[![Coverage](https://img.shields.io/codecov/c/github/x-cold/event-invoke/master.svg)](https://codecov.io/gh/x-cold/event-invoke)

Invoker and callee based on event model. (Inspired by [node-ipc-call](https://github.com/micooz/node-ipc-call))

```
$ npm install --save event-invoke
```

## Usage

```js
const { Caller } = require('event-invoke');

const invoker = Caller.fork('./foo.js');

await invoker.invoke('sleep', 1000);
await invoker.invoke('max', [1, 2, 3]); // 3

invoker.destroy();
```

```js
// ./foo.js
const { Callee } = require('event-invoke');

const callee = new Callee();

// async method
callee.register(async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
});

// sync method
callee.register(function max(...args) {
  return Math.max(...args);
});

callee.listen();
```

## License

MIT
