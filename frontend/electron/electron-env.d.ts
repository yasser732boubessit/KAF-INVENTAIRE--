/**
 * Ambient type declarations for Electron and SQLite native bindings
 */

declare module 'better-sqlite3' {
  interface DatabaseOptions {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
  }

  interface Statement<BindParameters extends unknown[] = unknown[], Result = unknown> {
    run(...params: BindParameters): { changes: number; lastInsertRowid: number | bigint };
    get(...params: BindParameters): Result | undefined;
    all(...params: BindParameters): Result[];
  }

  class Database {
    constructor(filename: string, options?: DatabaseOptions);
    prepare<BindParameters extends unknown[] = unknown[], Result = unknown>(source: string): Statement<BindParameters, Result>;
    exec(source: string): this;
    pragma(pragma: string, options?: { simple?: boolean }): unknown;
    close(): this;
  }

  export default Database;
}

declare module 'electron' {
  export const app: {
    whenReady(): Promise<void>;
    getPath(name: string): string;
    getVersion(): string;
    isPackaged: boolean;
    quit(): void;
    on(event: string, listener: (...args: any[]) => void): void;
  };

  export class BrowserWindow {
    constructor(options: any);
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
    static getAllWindows(): BrowserWindow[];
  }

  export const ipcMain: {
    handle(channel: string, listener: (event: any, ...args: any[]) => Promise<any> | any): void;
  };

  export const ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
  };

  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: any): void;
  };

  export const dialog: {
    showSaveDialog(browserWindow: BrowserWindow, options: any): Promise<{ canceled?: boolean; filePath?: string }>;
    showOpenDialog(browserWindow: BrowserWindow, options: any): Promise<{ canceled?: boolean; filePaths: string[] }>;
  };

  export const shell: {
    openPath(path: string): Promise<string>;
  };
}
