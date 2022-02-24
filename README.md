# event-invoke

[![NPM version][npm-image]][npm-url]
[![build status][gitflow-image]][gitflow-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/event-invoke.svg?style=flat-square
[npm-url]: https://npmjs.org/package/event-invoke
[gitflow-image]: https://github.com/x-cold/event-invoke/actions/workflows/ci.yml/badge.svg?branch=master
[gitflow-url]: https://github.com/x-cold/event-invoke/actions/workflows/ci.yml
[codecov-image]: https://codecov.io/gh/x-cold/event-invoke/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/x-cold/event-invoke
[download-image]: https://badgen.net/npm/dt/event-invoke
[download-url]: https://npmjs.org/package/event-invoke


The invoker based on event model provides an elegant way to call your methods in another container via promisify functions. (like child-processes, iframe, web worker etc).  (Inspired by [node-ipc-call](https://github.com/micooz/node-ipc-call))

![825cb24fe4bb2cc7f9713606d8594a77](https://user-images.githubusercontent.com/6903313/155465518-c0f7a648-ebf5-462a-b806-4d3ee1e78076.svg)

```
$ npm install --save event-invoke
```

## Usage

- Install the package

```bash
$ npm i -S event-invoke
```

### Invoking method via child process

- [Example code](https://github.com/x-cold/event-invoke/tree/master/examples/nodejs/child_process)

```js
// parent.js
const cp = require('child_process');
const { Invoker } = require('event-invoke');

const invokerChannel = cp.fork('./child.js');

const invoker = new Invoker(invokerChannel);

async function main() {
  const res1 = await invoker.invoke('sleep', 1000);
  console.log('sleep 1000ms:', res1);
  const res2 = await invoker.invoke('max', [1, 2, 3]); // 3
  console.log('max(1, 2, 3):', res2);
  invoker.destroy();
}

main();
```

```js
// child.js
const { Callee } = require('event-invoke');

const calleeChannel = process;

const callee = new Callee(calleeChannel);

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

### Invoking method via child process via custom channel

- [Example code](https://github.com/x-cold/event-invoke/tree/master/examples/nodejs/pm2)

```js
// pm2.config.cjs
module.exports = {
  apps: [
    {
      script: 'invoker.js',
      name: 'invoker',
      exec_mode: 'fork',
    },
    {
      script: 'callee.js',
      name: 'callee',
      exec_mode: 'fork',
    }
  ],
};

```

```js
// callee.js
import net from 'net';
import pm2 from 'pm2';
import {
  Callee,
  BaseCalleeChannel
} from 'event-invoke';

const messageType = 'event-invoke';
const messageTopic = 'some topic';

class CalleeChannel extends BaseCalleeChannel {
  constructor() {
    super();
    this._onProcessMessage = this.onProcessMessage.bind(this);
    process.on('message', this._onProcessMessage);
  }

  onProcessMessage(packet) {
    if (packet.type !== messageType) {
      return;
    }
    this.emit('message', packet.data);
  }

  send(data) {
    pm2.list((err, processes) => {
      if (err) { throw err; }
      const list = processes.filter(p => p.name === 'invoker');
      const pmId = list[0].pm2_env.pm_id;
      pm2.sendDataToProcessId({
        id: pmId,
        type: messageType,
        topic: messageTopic,
        data,
      }, function (err, res) {
        if (err) { throw err; }
      });
    });
  }

  destroy() {
    process.off('message', this._onProcessMessage);
  }
}

const channel = new CalleeChannel();
const callee = new Callee(channel);

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

// keep your process alive
net.createServer().listen();
```

```js
// invoker.js
import pm2 from 'pm2';
import {
  Invoker,
  BaseInvokerChannel
} from 'event-invoke';

const messageType = 'event-invoke';
const messageTopic = 'some topic';

class InvokerChannel extends BaseInvokerChannel {
  constructor() {
    super();
    this._onProcessMessage = this.onProcessMessage.bind(this);
    process.on('message', this._onProcessMessage);
  }

  onProcessMessage(packet) {
    if (packet.type !== messageType) {
      return;
    }
    this.emit('message', packet.data);
  }

  send(data) {
    pm2.list((err, processes) => {
      if (err) { throw err; }
      const list = processes.filter(p => p.name === 'callee');
      const pmId = list[0].pm2_env.pm_id;
      pm2.sendDataToProcessId({
        id: pmId,
        type: messageType,
        topic: messageTopic,
        data,
      }, function (err, res) {
        if (err) { throw err; }
      });
    });
  }

  connect() {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }

  destroy() {
    process.off('message', this._onProcessMessage);
  }
}

const channel = new InvokerChannel();
channel.connect();

const invoker = new Invoker(channel);

setInterval(async () => {
  const res1 = await invoker.invoke('sleep', 1000);
  console.log('sleep 1000ms:', res1);
  const res2 = await invoker.invoke('max', [1, 2, 3]); // 3
  console.log('max(1, 2, 3):', res2);
}, 5 * 1000);
```

### Web worker

TODO

### Iframe

TODO

### Browser page

TODO

## License

MIT
