import { shallow } from 'zustand/shallow';
import { useStore } from './index';

export const useParams = () => useStore((s) => s.params, shallow);
export const useDoorSwing = () => useStore((s) => s.params.doorSwingDeg);
export const useGizmoMode = () => useStore((s) => s.transforms.gizmoMode);
export const useActiveAgent = () => useStore((s) => s.transforms.activeAgent);
