// invoker.js
import pm2 from 'pm2';
import {
  Invoker
} from '../../../lib/index.js';
import EventEmitter from 'events';

const messageType = 'event-invoke';
const messageTopic = 'some topic';

class InvokerChannel extends EventEmitter {
  connected = false;

  onProcessMessage(packet) {
    if (packet.type !== messageType) {
      return;
    }
    this.emit('message', packet.data);
  }

  send(data) {
    pm2.list((err, processes) => {
      if (err) { throw err; }
      const list = processes.filter(p => p.name === 'callee');
      const pmId = list[0].pm2_env.pm_id;
      pm2.sendDataToProcessId({
        id: pmId,
        type: messageType,
        topic: messageTopic,
        data,
      }, function (err, res) {
        if (err) { throw err; }
      });
    });
  }

  connect() {
    process.on('message', this.onProcessMessage.bind(this));
    this.connected = true;
  }

  disconnect() {
    process.off('message', this.onProcessMessage.bind(this));
    this.connected = false;
  }
}

const channel = new InvokerChannel();
channel.connect();

const invoker = new Invoker(channel);

setInterval(async () => {
  const res1 = await invoker.invoke('sleep', 1000);
  console.log('sleep 1000ms:', res1);
  const res2 = await invoker.invoke('max', [1, 2, 3]); // 3
  console.log('max(1, 2, 3):', res2);
}, 5 * 1000);
