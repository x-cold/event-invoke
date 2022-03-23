'use strict';

const defaultOptions = {
  timeout: 3000,
}

class Invoker {

  constructor(channel, options = defaultOptions) {
    this._channel = channel;
    this._options = options;
    this._promiseMap = new Map();
    this._channel.on('message', this._onMessage.bind(this));
  }

  async invoke(name, args, options = this._options) {
    if (typeof name !== 'string' || !name) {
      throw Error('bad method name to invoke');
    }
    return new Promise((resolve, reject) => {
      if (!this._channel.connected) {
        return reject(Error('channel is not connected'));
      }
      const promises = this._promiseMap.get(name) || {};

      const keys = Object.keys(promises);
      const _seq = keys.length > 0 ? Math.max.apply(null, keys) + 1 : 0;

      // send message to sub process immediately
      this._channel.send({ _seq, name, args, _from: 'invoker' });

      // store Promise callback parameters
      promises[_seq] = { resolve, reject };

      this._promiseMap.set(name, promises);

      const { timeout } = options;
      if (timeout > 0) {
        setTimeout(() => this._onTimeout(name, _seq), timeout);
      }
    });
  }

  destroy() {
    for (const promises of this._promiseMap.values()) {
      Object.keys(promises).forEach(seq => {
        if (!promises || !promises[seq]) {
          return;
        }
        const { reject } = promises[seq];
        promises[seq] = undefined;
        reject(Error('rejected by destroy()'));
      });
    }
    if (typeof this._channel.disconnect === 'function') {
      this._channel.disconnect();
    }
    if (typeof this._channel.destroy === 'function') {
      this._channel.destroy();
    }
  }

  _onTimeout(name, seq) {
    const promises = this._promiseMap.get(name);
    if (!promises || !promises[seq]) {
      return;
    }
    const { reject } = promises[seq];

    promises[seq] = undefined;

    reject(Error(`method "${name}" timeout`));
  }

  _onMessage(msg) {
    // drop invalid message
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      return;
    }

    if (msg._from === 'invoker') {
      return;
    }

    const { _seq, _status, name, payload } = msg;

    const promises = this._promiseMap.get(name);
    // drop unknown message
    if (!promises || !promises[_seq]) {
      return;
    }

    const { resolve, reject } = promises[_seq];

    promises[_seq] = undefined;

    if (_status < 1) {
      resolve(payload);
    } else {
      reject(Error(payload));
    }
  }

}

module.exports = Invoker;
