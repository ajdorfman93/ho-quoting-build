import { shallow } from 'zustand/shallow';
import { useStore } from '../store';

export const useSharedParams = () => {
  const params = useStore((s) => s.params, shallow);
  const setParams = useStore((s) => s.setParams);
  const setDoorSwing = useStore((s) => s.setDoorSwing);
  return { params, setParams, setDoorSwing };
};
