# Initial Refactor Files — Install Guide

## Dependencies
```bash
npm i zustand @react-three/fiber three drei
# If you log with Redux DevTools in browsers:
# no extra install needed; zustand/devtools works with the extension
```
> Ensure DRACO/Meshopt decoder files are hosted (e.g., `public/draco/*`).

## Add SceneRoot
Mount `src/components/3d/SceneRoot.tsx` somewhere in your app, or replace your existing threejs entry with it for now.

## Next Steps
1. Replace `positionDoorPlaceholder` with your real placement function.
2. Wire TransformControls to commit changes on mouseUp to `setParams` / `setDoorSwing`.
3. Port any existing GLTF loads to `useGLTFAsset`.

## TypeScript Path Aliases (optional)
These files use relative imports; if you prefer `@/` aliases, add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": { "@/*": ["*"] }
  }
}
```
