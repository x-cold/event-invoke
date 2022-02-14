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

  destroy() {

  }
}

class BaseCalleeChannel extends EventEmitter {
  send(...args) {
    return this.emit('message', ...args);
  }

  destroy() {

  }
}

exports.BaseInvokerChannel = BaseInvokerChannel;
exports.BaseCalleeChannel = BaseCalleeChannel;
