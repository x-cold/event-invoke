
const Invoker = require('./invoker');
const child_bridge = require('child_process');

class Caller {

  static fork(modulePath, args, options) {
    return new Invoker(child_bridge.fork(modulePath, args, options));
  }

}

module.exports = Caller;
