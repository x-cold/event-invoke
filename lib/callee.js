class Callee {

  constructor(bridge) {
    if (!bridge && typeof process === 'object') {
      this._bridge = process;
    } else {
      this._bridge = bridge;
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
    this._bridge
      .on('message', this._onMessage.bind(this))
      .on('error', this._onError.bind(this));
  }

  destroy() {
    if (this._bridge) {
      this._bridge.removeListener('message', this._onMessage);
      this._bridge = null;
      this._functions = {};
    }
  }

  async _onMessage(msg) {
    if (typeof msg !== 'object') {
      return;
    }
    if (msg._from === 'callee') {
      return;
    }
    const { _bridge: bridge } = this;
    const { _seq, name, args = [] } = msg;
    const func = this._functions[name];
    if (typeof func !== 'function') {
      bridge.send({ _seq, _status: Callee.MSG_STATUS_NOT_FOUND, name, payload: `unregistered function: "${name}"`, _from: 'callee' });
      return;
    }
    try {
      const _args = Array.isArray(args) ? args : [args];
      const result = await func(..._args);
      bridge.send({ _seq, _status: Callee.MSG_STATUS_OK, name, payload: result, _from: 'callee' });
    } catch (err) {
      bridge.send({ _seq, _status: Callee.MSG_STATUS_FAIL, name, payload: err.message, _from: 'callee' });
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
