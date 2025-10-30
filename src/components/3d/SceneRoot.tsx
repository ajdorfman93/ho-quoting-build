import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import DoorGeomAgent from '../../agents/DoorGeomAgent';
import FrameHeadAgent from '../../agents/FrameHeadAgent';
import FrameRectAgent from '../../agents/FrameRectAgent';
import { log } from '../../utils/logger';

export default function SceneRoot() {
  useEffect(() => { log('Refactor','scene_mount',{}); }, []);
  return (
    <Canvas>
      <Suspense fallback={null}>
        <DoorGeomAgent />
        <FrameHeadAgent />
        <FrameRectAgent />
      </Suspense>
    </Canvas>
  );
}
