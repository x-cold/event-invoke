class Callee {

  constructor(channel) {
    if (!channel && typeof process === 'object') {
      this._channel = process;
    } else {
      this._channel = channel;
    }
    this._functions = {};
    this._listened = false;
  }

  register(arg) {
    if (typeof arg === 'function' && arg.name) {
      this._functions[arg.name] = arg;
    } else if (Array.isArray(arg)) {
      arg.forEach(func => this.register(func));
    } else if (typeof arg === 'object') {
      Object.keys(arg).forEach(name => this.register(arg[name]));
    } else {
      throw Error(`cannot register "${typeof arg}"`);
    }
  }

  listen() {
    if (this._listened) {
      throw new Error('already listened');
    }
    this._listened = true;
    this._channel
      .on('message', this._onMessage.bind(this))
      .on('error', this._onError.bind(this));
    return this;
  }

  destroy() {
    if (!this._channel) {
      return;
    }

    this._channel.removeListener('message', this._onMessage);
    if (typeof process === 'object' && this._channel !== process) {
      typeof this._channel.disconnect === 'function' && this._channel.disconnect();
    }

    this._functions = {};
    this._channel = null;
  }

  async _onMessage(msg) {
    if (typeof msg !== 'object') {
      return;
    }
    if (msg._from === 'callee') {
      return;
    }
    const { _channel: channel } = this;
    const { _seq, name, args = [] } = msg;
    const func = this._functions[name];
    if (typeof func !== 'function') {
      channel.send({ _seq, _status: Callee.MSG_STATUS_NOT_FOUND, name, payload: `unregistered function: "${name}"`, _from: 'callee' });
      return;
    }
    try {
      const _args = Array.isArray(args) ? args : [args];
      const result = await func(..._args);
      channel.send({ _seq, _status: Callee.MSG_STATUS_OK, name, payload: result, _from: 'callee' });
    } catch (err) {
      channel.send({ _seq, _status: Callee.MSG_STATUS_FAIL, name, payload: err.message, _from: 'callee' });
    }
  }

  _onError(err) {
    if (err.code === 'ERR_IPC_CHANNEL_CLOSED') {
      return;
    }
    throw err;
  }

}

Callee.MSG_STATUS_OK = 0;
Callee.MSG_STATUS_FAIL = 1;
Callee.MSG_STATUS_NOT_FOUND = 2;

module.exports = Callee;
