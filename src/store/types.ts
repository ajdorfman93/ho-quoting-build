export type SharedParams = {
  openingW: number; openingH: number; D: number; headDepth: number;
  frameProfile: 'L'|'R'|'LR'|'RR'|'?';
  StopHeight: number; DoorTopGap: number; DoorBottomGap: number;
  DoorHingeGap: number; DoorStrikeGap: number; DoorInset: number; DoorThickness: number;
  doorSwingDeg: number; // 0..90
};

export type TransformsState = {
  gizmoMode: 'translate'|'rotate'|'scale';
  activeAgent?: 'DoorGeomAgent'|'FrameHeadAgent'|'FrameRectAgent';
  snap: boolean; snapInc: number;
};

export type AssetState = {
  cache: Record<string, { url:string; status:'idle'|'loading'|'ready'|'error'; error?:string }>;
};
