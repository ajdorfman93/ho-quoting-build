import { useEffect } from 'react';
import { useStore } from '../store';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Shared singleton loader with DRACO + Meshopt support */
const sharedLoader = (() => {
  const l = new GLTFLoader();
  const d = new DRACOLoader();
  d.setDecoderPath('/draco/'); // ensure decoders are hosted here
  l.setDRACOLoader(d);
  l.setMeshoptDecoder(MeshoptDecoder);
  return l;
})();

export function useGLTFAsset(url: string, onLoaded: (gltf:any)=>void) {
  const set = useStore((s) => s.setAssetStatus);
  useEffect(() => {
    let cancelled = false;
    set(url, 'loading');
    sharedLoader.load(
      url,
      (g) => { if (!cancelled) { set(url, 'ready'); onLoaded(g); } },
      undefined,
      (e) => { if (!cancelled) set(url, 'error', (e as any)?.message ?? 'load failed'); }
    );
    return () => { cancelled = true; };
  }, [url, set, onLoaded]);
}
