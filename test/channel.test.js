const path = require('path');
const Invoker = require('../lib/invoker');
const Callee = require('../lib/callee');
const BaseChannel = require('../lib/channel');
const child_process = require('child_process');

const fooScript = path.join(__dirname, 'scripts/foo.js');

class InvokerChannel extends BaseChannel {
  constructor(script) {
    super();
    this.connect(child_process.fork(script));
  }

  get connected() {
    if (!this.cp) {
      return false;
    }
    return this.cp.connected;
  }

  send(...args) {
    if (!this.cp) {
      return;
    }
    return this.cp.send(...args);
  }

  disconnect() {
    if (!this.cp) {
      return;
    }
    return this.cp.disconnect();
  }

  connect(cp) {
    this.cp = cp;
    this.cp.on('message', (packet) => {
      if (packet._from !== 'callee') {
        return;
      }
      return this.emit('message', packet);
    })
  }
}

class SimpleCommonChannel extends BaseChannel {
}

const commonChannel = new SimpleCommonChannel();


test('fork() should not throw', () => {
  expect(() => {
    const invoker = new Invoker(new InvokerChannel(fooScript));
    invoker.destroy();
  }).not.toThrow();
});

test('destroy() should be ok', async () => {
  const invoker = new Invoker(new InvokerChannel(fooScript));
  await invoker.invoke('foo');
  expect(() => invoker.destroy()).not.toThrow();
});

test('destroy() should be ok without disconnecting channel', async () => {
  const channel = new InvokerChannel(fooScript);
  channel.disconnect = undefined;
  const invoker = new Invoker(channel);
  await invoker.invoke('foo');
  expect(() => invoker.destroy()).not.toThrow();
});

test('destroy() should reject unconsumed promises', async () => {
  const invoker = new Invoker(new InvokerChannel(fooScript));
  const promise = invoker.invoke('foo');
  invoker.destroy();
  try {
    await promise;
  } catch (err) {
    expect(err.message).toMatch('rejected by destroy()');
  }
});

test('invoke(max) should return 3', async () => {
  const callee = new Callee(commonChannel);
  // sync method
  callee.register(function max(...args) {
    return Math.max(...args);
  });
  callee.listen();

  const invoker = new Invoker(commonChannel);
  // NOTICE: before invoking a method, channel.connected should equal to true.
  commonChannel.connect();

  expect(await invoker.invoke('max', [1, 2, 3])).toBe(3);
  invoker.destroy();
});
