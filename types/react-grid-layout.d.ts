declare module "react-grid-layout" {
  import * as React from "react";

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    moved?: boolean;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    resizeHandles?: Array<"s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne">;
  }

  export interface LayoutItem extends Layout {
    isBounded?: boolean;
  }

  export interface ReactGridLayoutProps {
    children?: React.ReactNode;
    width?: number;
    className?: string;
    style?: React.CSSProperties;
    autoSize?: boolean;
    cols?: number;
    rowHeight?: number;
    maxRows?: number;
    margin?: [number, number];
    containerPadding?: [number, number];
    layout?: Layout[];
    compactType?: "vertical" | "horizontal" | null;
    preventCollision?: boolean;
    isBounded?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    draggableHandle?: string;
    draggableCancel?: string;
    useCSSTransforms?: boolean;
    verticalCompact?: boolean;
    allowOverlap?: boolean;
    resizeHandles?: Array<"s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne">;
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStop?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: Event, element: HTMLElement) => void;
    onResizeStop?: (layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, event: Event, element: HTMLElement) => void;
  }

  export interface WidthProviderProps {
    measureBeforeMount?: boolean;
    useCSSTransforms?: boolean;
    compactType?: "vertical" | "horizontal" | null;
  }

  export type WidthProviderCallback<P> = (component: React.ComponentType<P>) => React.ComponentType<P>;

  declare class ReactGridLayout extends React.Component<ReactGridLayoutProps> {}

  export default ReactGridLayout;

  export function WidthProvider<P extends ReactGridLayoutProps>(component: React.ComponentType<P>): React.ComponentType<P>;
}
