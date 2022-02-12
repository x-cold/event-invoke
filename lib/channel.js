'use strict';

const EventEmitter = require('eventemitter3');

class BaseInvokerChannel extends EventEmitter {
  send(...args) {
    return this.emit('message', ...args);
  }

  connect() {
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
  }

  destory() {

  }
}

class BaseCalleeChannel extends EventEmitter {
  send(...args) {
    return this.emit('message', ...args);
  }

  destory() {

  }
}

exports.BaseInvokerChannel = BaseInvokerChannel;
exports.BaseCalleeChannel = BaseCalleeChannel;
