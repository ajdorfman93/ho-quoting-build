import { memo } from 'react';
import { useSharedParams } from '../hooks/useSharedParams';
import { log } from '../utils/logger';

/** Minimal placeholder agent that reads shared params but does not mutate scene */
function FrameRectAgentInner() {
  const { params } = useSharedParams();
  // Could render jamb/rect geometry using openingW/openingH
  log('Refactor','frame_rect_render', { openingW: params.openingW, openingH: params.openingH });
  return null;
}

const FrameRectAgent = memo(FrameRectAgentInner);
export default FrameRectAgent;
