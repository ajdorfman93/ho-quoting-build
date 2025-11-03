declare module "react-grid-layout" {
  import * as React from "react";

  export type CssDimension = number | string;

  export type CssSpacing = CssDimension | [CssDimension, CssDimension];

  type BivariantEventHandler<Args extends unknown[]> = {
    bivarianceHack: (...args: Args) => void;
  }["bivarianceHack"];

  export interface UniformRowCssProperties {
    /**
     * Ensures row participants share a consistent height while width is driven by layout units.
     */
    height: CssDimension;
    /**
     * Padding applied uniformly to every cell within the row. Expressed as a CSS shorthand tuple.
     */
    padding: CssSpacing;
    /**
     * Margin applied uniformly to every cell within the row. Expressed as a CSS shorthand tuple.
     */
    margin: CssSpacing;
  }

  export interface ResizeHandleStyle {
    /**
     * Width of the draggable handle that follows the cursor. Defaults to 4px.
     */
    width?: CssDimension;
    /**
     * Height of the draggable handle that follows the cursor. Defaults to 25px.
     */
    height?: CssDimension;
    /**
     * Optional class name to augment handle styling.
     */
    className?: string;
  }

  export interface ResizeGuideStyle {
    /**
     * Thickness of the guide line rendered between cells. Defaults to 2.5px.
     */
    thickness?: CssDimension;
    /**
     * Optional class name to augment guide styling.
     */
    className?: string;
  }

  export interface ResizeVisualizationOptions {
    /**
     * Orientation the handle is allowed to travel in; maps to row (horizontal) or column (vertical) interactions.
     */
    axis: "horizontal" | "vertical";
    /**
     * Styling for the guide line that appears while resizing.
     */
    guide?: ResizeGuideStyle;
    /**
     * Styling for the draggable handle that shadows the cursor.
     */
    handle?: ResizeHandleStyle;
  }

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
    /**
     * Logical identifier grouping items that must share a uniform row configuration.
     */
    rowGroupId?: string;
    /**
     * Uniform CSS properties shared across every grid item that participates in the rowGroupId.
     * Width is intentionally omitted so column sizing continues to originate from the grid math.
     */
    rowCss?: Readonly<UniformRowCssProperties>;
    /**
     * Declares how the layout item should scale when participating in resize gestures.
     * "row" enforces uniform row height adjustments, "column" enforces column width adjustments.
     */
    scalingAxis?: "row" | "column" | "both" | "none";
    /**
     * Customise the guide line and draggable handle shown during resize interactions for this item.
     */
    resizeVisualization?: ResizeVisualizationOptions;
  }

  export interface LayoutItem extends Layout {
    isBounded?: boolean;
  }

  export interface UniformRowLayoutItem<GroupId extends string, Y extends number, Height extends number, Padding extends CssSpacing, Margin extends CssSpacing>
    extends Layout {
    rowGroupId: GroupId;
    y: Y;
    h: Height;
    rowCss: Readonly<{
      height: CssDimension;
      padding: Padding;
      margin: Margin;
    }>;
    scalingAxis: "row";
  }

  export type UniformRowLayout<
    GroupId extends string = string,
    Y extends number = number,
    Height extends number = number,
    Padding extends CssSpacing = CssSpacing,
    Margin extends CssSpacing = CssSpacing
  > = ReadonlyArray<UniformRowLayoutItem<GroupId, Y, Height, Padding, Margin>>;

  export interface UniformRowResizeEvent<
    GroupId extends string = string,
    Y extends number = number,
    Height extends number = number,
    Padding extends CssSpacing = CssSpacing,
    Margin extends CssSpacing = CssSpacing
  > {
    layout: UniformRowLayout<GroupId, Y, Height, Padding, Margin>;
    visualization?: ResizeVisualizationOptions;
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
    /**
     * When true, react-grid-layout expects every rowGroupId cohort to share identical rowCss values.
     */
    enforceUniformRowCss?: boolean;
    /**
     * Enforces row resize gestures to scale every item in the targeted rowGroupId uniformly.
     * Defaults to true so rows remain visually aligned.
     */
    uniformRowScaling?: boolean;
    /**
     * Controls the styling for resize guide lines and handles on a per-axis basis.
     */
    resizeGuides?: Partial<Record<"row" | "column", ResizeVisualizationOptions>>;
    onLayoutChange?: BivariantEventHandler<[Layout[]]>;
    onDragStop?: BivariantEventHandler<[Layout[], Layout, Layout, Layout, Event, HTMLElement]>;
    onResizeStop?: BivariantEventHandler<[Layout[], Layout, Layout, Layout, Event, HTMLElement, UniformRowResizeEvent | undefined]>;
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
