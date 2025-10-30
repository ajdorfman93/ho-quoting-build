import { memo } from 'react';
import { useSharedParams } from '../hooks/useSharedParams';
import { log } from '../utils/logger';

/** Minimal placeholder agent that reads shared params but does not mutate scene */
function FrameHeadAgentInner() {
  const { params } = useSharedParams();
  // Could render head geometry using params.headDepth, etc.
  log('Refactor','frame_head_render', { headDepth: params.headDepth });
  return null;
}

const FrameHeadAgent = memo(FrameHeadAgentInner);
export default FrameHeadAgent;
