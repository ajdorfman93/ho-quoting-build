import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import type { SharedParams, TransformsState, AssetState } from './types';

type Store = {
  params: SharedParams;
  transforms: TransformsState;
  assets: AssetState;

  setParams: (patch: Partial<SharedParams>) => void;
  setDoorSwing: (deg: number) => void;
  setGizmoMode: (m: TransformsState['gizmoMode']) => void;
  setActiveAgent: (a: TransformsState['activeAgent']) => void;
  setAssetStatus: (url:string, status:AssetState['cache'][string]['status'], error?:string) => void;
};

const defaults: SharedParams = {
  openingW: 36, openingH: 84, D: 0, headDepth: 2,
  frameProfile: 'L', StopHeight: 0.5, DoorTopGap: 0.125, DoorBottomGap: 0.75,
  DoorHingeGap: 0.125, DoorStrikeGap: 0.125, DoorInset: 0.25, DoorThickness: 1.75,
  doorSwingDeg: 0,
};

export const useStore = create<Store>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        params: defaults,
        transforms: { gizmoMode: 'translate', snap: false, snapInc: 0.5 },
        assets: { cache: {} },

        setParams: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
        setDoorSwing: (deg) => set((s) => ({ params: { ...s.params, doorSwingDeg: Math.max(0, Math.min(90, deg)) } })),
        setGizmoMode: (m) => set((s) => ({ transforms: { ...s.transforms, gizmoMode: m } })),
        setActiveAgent: (a) => set((s) => ({ transforms: { ...s.transforms, activeAgent: a } })),
        setAssetStatus: (url, status, error) =>
          set((s) => ({ assets: { cache: { ...s.assets.cache, [url]: { url, status, error } } } })),
      })),
      { name: 'builder-state' }
    )
  )
);
