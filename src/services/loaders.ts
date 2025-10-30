import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Shared GLTF loader singleton, import where you need to load GLBs */
export const gltfLoader = (() => {
  const l = new GLTFLoader();
  const d = new DRACOLoader();
  d.setDecoderPath('/draco/');
  l.setDRACOLoader(d);
  l.setMeshoptDecoder(MeshoptDecoder);
  return l;
})();
