declare module "sortablejs" {
  interface SortableOptions {
    animation?: number;
    draggable?: string;
    handle?: string;
    filter?: string;
    disabled?: boolean;
    easing?: string;
    dragClass?: string;
    ghostClass?: string;
    chosenClass?: string;
    selectedClass?: string;
    fallbackTolerance?: number;
    multiDrag?: boolean;
    multiDragKey?: string | null | false;
    avoidImplicitDeselect?: boolean;
    delay?: number;
    delayOnTouchOnly?: boolean;
    preventOnFilter?: boolean;
    onChoose?: (event: unknown) => void;
    onUnchoose?: (event: unknown) => void;
    onStart?: (event: unknown) => void;
    onEnd?: (event: unknown) => void;
    onSort?: (event: unknown) => void;
    onUpdate?: (event: unknown) => void;
  }

  interface SortableInstance {
    option<K extends keyof SortableOptions>(name: K, value: SortableOptions[K]): void;
    option(name: string, value: unknown): void;
    destroy(): void;
    closest(element: Element, selector: string): Element | null;
  }

  interface SortableStatic {
    create(element: HTMLElement, options?: SortableOptions): SortableInstance;
    mount(...plugins: Array<any>): void;
  }

  const Sortable: SortableStatic;
  export default Sortable;
}

declare module "sortablejs/plugins/MultiDrag" {
  const MultiDrag: {
    new (): any;
  };
  export default MultiDrag;
}
