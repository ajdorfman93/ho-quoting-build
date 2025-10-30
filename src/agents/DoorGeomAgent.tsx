import { useEffect, useMemo, useRef } from 'react';
import { Group } from 'three';
import { useSharedParams } from '../hooks/useSharedParams';
import { log } from '../utils/logger';

/** Placeholder for your real door placement logic.
 * Replace `positionDoor` with your project-specific implementation.
 */
function positionDoorPlaceholder(root: Group, inputs: Record<string, number | string>) {
  // Example: set a deterministic rotation from doorSwingDeg
  root.rotation.y = ((inputs.doorSwingDeg as number) ?? 0) * Math.PI / 180;
}

export default function DoorGeomAgent() {
  const { params } = useSharedParams();
  const root = useRef<Group>(null!);

  const inputs = useMemo(() => ({
    openingW: params.openingW, openingH: params.openingH, D: params.D, headDepth: params.headDepth,
    frameProfile: params.frameProfile, StopHeight: params.StopHeight,
    DoorTopGap: params.DoorTopGap, DoorBottomGap: params.DoorBottomGap,
    DoorHingeGap: params.DoorHingeGap, DoorStrikeGap: params.DoorStrikeGap,
    DoorInset: params.DoorInset, DoorThickness: params.DoorThickness,
    doorSwingDeg: params.doorSwingDeg
  }), [params]);

  useEffect(() => {
    if (!root.current) return;
    const t0 = performance.now();
    positionDoorPlaceholder(root.current, inputs);
    log('Transforming','door_positioned',{ dur: Math.round(performance.now() - t0) });
  }, [inputs]);

  return <group ref={root} name="DoorGeomAgent" />;
}
