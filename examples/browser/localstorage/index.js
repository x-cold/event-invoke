const Callee = require('../lib/callee');
const Invoker = require('../lib/invoker');
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

