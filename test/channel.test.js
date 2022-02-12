const path = require('path');
const child_process = require('child_process');
const { EventEmitter } = require('eventemitter3');
const Invoker = require('../lib/invoker');
const Callee = require('../lib/callee');
const { BaseInvokerChannel, BaseCalleeChannel } = require('../lib/channel');

const fooScript = path.join(__dirname, 'scripts/foo.js');

class InvokerChannel extends BaseInvokerChannel {
  constructor(script) {
    super();
    this.connect(script);
    this._onProcessMessage = this.onProcessMessage.bind(this);
    this.cp.on('message', this._onProcessMessage);
  }

  onProcessMessage(packet) {
    if (packet._from !== 'callee') {
      return;
    }
    return this.emit('message', packet);
  }

  get connected() {
    return this.cp.connected;
  }

  send(...args) {
    return this.cp.send(...args);
  }

  disconnect() {
    return this.cp.disconnect();
  }

  connect(script) {
    this.cp = child_process.fork(script);
  }

  destory() {
    // NOTICE: Node.js v8.x does not provide off method
    this.cp.off && this.cp.off('message', this._onProcessMessage);
  }
}

class EventInvokerChannel extends BaseInvokerChannel {
  constructor(bus) {
    super();
    this._bus = bus;
    this._onMessage = this.onMessage.bind(this);
    this._bus.on('message', this._onMessage);
  }

  onMessage(packet) {
    return this.emit('message', packet);
  }

  send(...args) {
    return this._bus.emit('message', ...args);
  }

  disconnect() {
    this.connected = false;
  }

  connect() {
    this.connected = true;
  }

  destory() {
    this._bus.off('message', this._onMessage);
  }
}

class EventCalleeChannel extends BaseCalleeChannel {
  constructor(bus) {
    super();
    this._bus = bus;
    this._onMessage = this.onMessage.bind(this);
    this._bus.on('message', this._onMessage);
  }

  onMessage(packet) {
    return this.emit('message', packet);
  }

  send(...args) {
    return this._bus.emit('message', ...args);
  }

  destory() {
    this._bus.off('message', this._onMessage);
  }
}

const bus = new EventEmitter();

const eventInvokerChannel = new EventInvokerChannel(bus);
const eventCalleeChannel = new EventCalleeChannel(bus);

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
  const callee = new Callee(eventCalleeChannel);
  // sync method
  callee.register(function max(...args) {
    return Math.max(...args);
  });
  callee.listen();

  const invoker = new Invoker(eventInvokerChannel);
  // NOTICE: before invoking a method, channel.connected should equal to true.
  eventInvokerChannel.connect();

  expect(await invoker.invoke('max', [1, 2, 3])).toBe(3);
  invoker.destroy();
  callee.destroy();
});

test('base channel should be ok', async () => {
  const baseCalleeChannel = new BaseCalleeChannel();
  const callee = new Callee(baseCalleeChannel);
  // sync method
  callee.register(function max(...args) {
    return Math.max(...args);
  });
  callee.listen();

  const bsaeInvokerChannel = new BaseInvokerChannel();
  const invoker = new Invoker(bsaeInvokerChannel);
  // NOTICE: before invoking a method, channel.connected should equal to true.
  bsaeInvokerChannel.connect();

  // NOTICE: the following two lines do nothing but improve codecov
  baseCalleeChannel.send({ test: 1 });
  bsaeInvokerChannel.send({ test: 1 });

  expect(bsaeInvokerChannel.connected).toBe(true);
  invoker.destroy();
  callee.destroy();
  expect(bsaeInvokerChannel.connected).toBe(false);
});
