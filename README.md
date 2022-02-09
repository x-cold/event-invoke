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

### Rpc call for cross-process app

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

### Custom rpc call via pm2 process manager

```js
// pm2.config.js
module.exports = {
  apps: [
    {
      script: 'master.js',
      name: 'master',
      exec_mode: 'fork',
    },
    {
      script: 'worker.js',
      name: 'worker',
      exec_mode: 'fork',
      instances: 2,
    }
  ],
};

```

```js
// master.js
import pm2 from 'pm2';
import {
  Invoker
} from 'event-invoke';
import EventEmitter from 'events';

class Bridge extends EventEmitter {
  connected = true;
  index = -1;

  constructor() {
    super();
    process.on('message', (packet) => {
      this.emit('message', packet.data);
    });
  }

  send(data) {
    pm2.list((err, processes) => {
      const list = processes.filter(p => p.name === 'worker');
      this.index = (this.index + 1) % list.length;
      const workerPid = list[this.index].pm2_env.pm_id;
      pm2.sendDataToProcessId({
        type: 'worker:msg',
        data,
        id: workerPid,
        topic: 'some topic',
      }, function (err, res) {
        if (err) { throw err }
      });
    });
  }

  disconnect() {
    this.connected = false;
  }

  connect() {
    this.connected = true;
  }
}

const bridge = new Bridge();
const invoker = new Invoker(bridge);

setInterval(async () => {
  const res2 = await invoker.invoke('max', [1, 2, 3]); // 3
  console.log('max(1, 2, 3):', res2);
}, 5 * 1000);

```

```js
// worker.js
import net from 'net';
import pm2 from 'pm2';
import {
  Callee
} from 'event-invoke';
import EventEmitter from 'events';

class Bridge extends EventEmitter {
  connected = true;

  constructor() {
    super();
    process.on('message', (packet) => {
      this.emit('message', packet.data);
    });
  }

  send(data) {
    pm2.list((err, processes) => {
      const list = processes.filter(p => p.name === 'master');
      const pid = list[0].pm2_env.pm_id;
      pm2.sendDataToProcessId({
        type: 'master:msg',
        data,
        id: pid,
        topic: 'some topic',
      }, function (err, res) {
        if (err) { throw err }
      });
    });
  }

  disconnect() {
    this.connected = false;
  }

  connect() {
    this.connected = true;
  }
}

const bridge = new Bridge();
const callee = new Callee(bridge);

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

```bash
# Startup app
pm2 restart pm2.config.js --watch --no-daemon
```

### Custom rpc call by event-emitter

```js
const Callee = require('./lib/callee');
const Invoker = require('./lib/invoker');
const EventEmitter = require('events');

class Bridge extends EventEmitter {
  connected = false;

  send(...args) {
    return this.emit('message', ...args);
  }

  disconnect() {
    this.connected = false;
  }

  connect() {
    this.connected = true;
  }
}

const bridge = new Bridge();

const callee = new Callee(bridge);

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

const invoker = new Invoker(bridge);

async function main() {
  const res1 = await invoker.invoke('sleep', 1000);
  console.log('sleep 1000ms:', res1);
  const res2 = await invoker.invoke('max', [1, 2, 3]); // 3
  console.log('max(1, 2, 3):', res2);
  invoker.destroy();
}

bridge.connect();

main();
```

## License

MIT
