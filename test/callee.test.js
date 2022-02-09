const Callee = require('../lib/callee');
const { mockProcessSend } = require('./helpers');

test('new Callee() should not throw', () => {
  expect(() => new Callee()).not.toThrow();
});

test('register() should throw when arg is invalid', () => {
  const callee = new Callee();
  expect(() => callee.register(null)).toThrow();
  expect(() => callee.register(function () {
  })).toThrow();
});

test('register() should not throw', () => {
  const callee = new Callee();
  const foo = () => null;
  expect(() => callee.register({})).not.toThrow();
  expect(() => callee.register({ foo })).not.toThrow();
  expect(() => callee.register([])).not.toThrow();
  expect(() => callee.register([foo, foo])).not.toThrow();
  expect(() => callee.register(function foo() {
  })).not.toThrow();
});

test('listen() should throw when called multiple times', () => {
  const callee = new Callee();
  callee.listen();
  expect(() => callee.listen()).toThrow();
});

test('listen() should be ok', () => {
  const callee = new Callee();
  expect(() => callee.listen()).not.toThrow();
});

test('destroy() should be ok', () => {
  const callee = new Callee();
  callee.listen();
  expect(() => callee.destroy()).not.toThrow();
});

test('destroy() can be called multiple times', () => {
  const callee = new Callee();
  callee.listen();
  expect(() => callee.destroy()).not.toThrow();
  expect(() => callee.destroy()).not.toThrow();
});

test('_onMessage() should return nothing when msg is invalid', async () => {
  const callee = new Callee();
  expect(await callee._onMessage()).toBe(undefined);
});

test('_onMessage() should send message which status is MSG_STATUS_NOT_FOUND', async () => {
  const callee = new Callee();
  const send = mockProcessSend();
  await callee._onMessage({});
  expect(send).toHaveBeenCalledWith({
    "_seq": undefined,
    "_status": Callee.MSG_STATUS_NOT_FOUND,
    "name": undefined,
    "payload": "unregistered function: \"undefined\"",
    "_from": "callee"
  });
});

test('_onMessage() should send message which status is MSG_STATUS_OK', async () => {
  const callee = new Callee();
  callee.register({ foo: () => 'foo return' });
  const send = mockProcessSend();
  await callee._onMessage({ name: 'foo', args: null });
  expect(send).toHaveBeenCalledWith({
    "_seq": undefined,
    "_status": Callee.MSG_STATUS_OK,
    "name": "foo",
    "payload": "foo return",
    "_from": "callee"
  });
});

test('_onMessage() should send message which status is MSG_STATUS_FAIL', async () => {
  const callee = new Callee();
  callee.register({
    foo: () => {
      throw Error('foo throw');
    },
  });
  const send = mockProcessSend();
  await callee._onMessage({ name: 'foo' });
  expect(send).toHaveBeenCalledWith({
    "_seq": undefined,
    "_status": Callee.MSG_STATUS_FAIL,
    "name": "foo",
    "payload": "foo throw",
    "_from": "callee"
  });
});

test('_onError() specific errors should do nothing', () => {
  const callee = new Callee();
  const errors = [{ code: 'ERR_IPC_CHANNEL_CLOSED' }];
  for (const err of errors) {
    expect(callee._onError(err)).toBe(undefined);
  }
});

test('_onError() other errors should throw it', () => {
  const callee = new Callee();
  expect(() => callee._onError({ code: 'UNKNOWN_ERROR_CODE' })).toThrow();
});
