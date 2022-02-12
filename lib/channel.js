'use strict';

const EventEmitter = require('eventemitter3');

class BaseChannel extends EventEmitter {
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

module.exports = BaseChannel;
