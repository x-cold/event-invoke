// child.js
const { Callee } = require('../../../lib');

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
