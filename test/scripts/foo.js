const { Callee } = require('../../lib');

const callee = new Callee();

callee.register(function foo(a = 'a', b = 'b') {
  return `foo.${a}.${b}`;
});

callee.register(function longTask() {
  return new Promise((resolve => {
    setTimeout(resolve, 1000);
  }));
});

callee.listen();
