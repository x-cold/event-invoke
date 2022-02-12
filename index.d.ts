import EventEmitter from "eventemitter3";

type AsyncReturnType<T extends (...args: any) => any> =
	T extends (...args: any) => Promise<infer U> ? U :
	T extends (...args: any) => infer U ? U :
	any;

type SafeAsyncReturnType<T> = T extends (...args: any) => any ? AsyncReturnType<T> : void;

type SafeParameters<T> = T extends (...args: any) => any ? Parameters<T> : [void];

type ArrayOrItem<T extends any[]> = T extends [infer L, ...infer R] ? (0 extends R['length'] ? T[0] : T) : void;

export class BaseInvokerChannel extends EventEmitter {
  public connected: boolean;

  send(...args: unknown[]): void;

  connect(): void;
  
  disconnect(): void;

  destory(): void;
}

export class BaseCalleeChannel extends EventEmitter {
  send(...args: unknown[]): void;

  destory(): void;
}

export interface InvokerOptions {
  timeout: number;
}

export class Invoker<API_MAPPING = {}> {
  private _channel: BaseInvokerChannel;
  private _options: InvokerOptions;
  private _promiseMap: Map<string, Function>;
  
  constructor(channel: BaseInvokerChannel, options?: InvokerOptions);

  invoke<K extends keyof API_MAPPING>(
    name: K,
    args: ArrayOrItem<SafeParameters<API_MAPPING[K]>>,
    options?: InvokerOptions
  ): Promise<SafeAsyncReturnType<API_MAPPING[K]>>;

  destory(): void;

  private _onTimeout(name: string, seq: number): void;

  private _onMessage(msg: unknown): void;
}

export interface CalleeOptions {
  onError(err: Error): void;
}

export class Callee {
  private _channel: BaseCalleeChannel;
  private _functions: Record<string, Function>;
  private _listened: boolean;
  private _options: CalleeOptions;

  constructor(channel?: BaseCalleeChannel, options?: CalleeOptions);

  register(func: Function);
  register(func: Function[]);
  register(func: Record<string, Function>);

  listen(): Callee;

  destory(): void;

  private _onMessage(msg: unknown): void;

  private _onError(err: Error): void;
}
