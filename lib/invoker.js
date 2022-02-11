
class Invoker {

  constructor(channel) {
    if (!channel && typeof process === 'object') {
      this._channel = process;
    } else {
      this._channel = channel;
    }
    this._defaultOptions = {
      timeout: 3000,
    };
    this._promiseMap = new Map();
    this._channel.on('message', this._onMessage.bind(this));
  }

  async invoke(name, args, options = this._defaultOptions) {
    if (typeof name !== 'string' || !name) {
      throw Error('bad method name to invoke');
    }
    return new Promise((resolve, reject) => {
      if (!this._channel.connected) {
        return reject(Error('bridge is not connected'));
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
        const { reject } = promises[seq];
        delete promises[seq];
        reject(Error('rejected by destroy()'));
      });
    }
    if (this._channel && this._channel.connected) {
      this._channel.disconnect();
    }
  }

  _onTimeout(name, seq) {
    const promises = this._promiseMap.get(name);
    if (!promises || !promises[seq]) {
      return;
    }
    const { reject } = promises[seq];

    delete promises[seq];

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

    delete promises[_seq];

    if (_status < 1) {
      resolve(payload);
    } else {
      reject(Error(payload));
    }
  }

}

module.exports = Invoker;
