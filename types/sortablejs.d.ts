declare module "sortablejs" {
  interface SortableOptions {
    animation?: number;
    draggable?: string;
    handle?: string;
    filter?: string;
    disabled?: boolean;
    onEnd?: (event: unknown) => void;
  }

  interface SortableInstance {
    option<K extends keyof SortableOptions>(name: K, value: SortableOptions[K]): void;
    option(name: string, value: unknown): void;
    destroy(): void;
  }

  interface SortableStatic {
    create(element: HTMLElement, options?: SortableOptions): SortableInstance;
  }

  const Sortable: SortableStatic;
  export default Sortable;
}
