// parent.js
const cp = require('child_process');
const path = require('path');
const { Invoker } = require('../../../lib');

const invokerChannel = cp.fork(path.join(__dirname, './child.js'));

const invoker = new Invoker(invokerChannel);

async function main() {
  const res1 = await invoker.invoke('sleep', 1000);
  console.log('sleep 1000ms:', res1);
  const res2 = await invoker.invoke('max', [1, 2, 3]); // 3
  console.log('max(1, 2, 3):', res2);
  invoker.destroy();
}

main();
