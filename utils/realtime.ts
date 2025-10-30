import { EventEmitter } from "events";

export type TableChangeEvent =
  | {
      table: string;
      type: "rowCreated" | "rowUpdated" | "rowDeleted";
      payload: { rowId: string; values?: Record<string, unknown> };
      timestamp: string;
    }
  | {
      table: string;
      type: "columnCreated" | "columnUpdated" | "columnDeleted" | "columnReordered";
      payload: { columnKey?: string; columnKeys?: string[] };
      timestamp: string;
    };

type Listener = (event: TableChangeEvent) => void;

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export function emitTableChange(event: TableChangeEvent) {
  emitter.emit(event.table, event);
  emitter.emit("*", event);
}

export function subscribeToTable(table: string, listener: Listener) {
  emitter.on(table, listener);
  return () => {
    emitter.off(table, listener);
  };
}
