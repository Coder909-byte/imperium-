// Art and actor coordinates share the authored 1280px-wide 21:9 frame.
// Viewport changes fit that composition rather than resizing each layer
// independently and leaving actors stranded in their old pixel positions.
export const SCENE_SPACE = { width: 1280, height: 1280 * 9 / 21 } as const;
export const SCENE_OVERSCAN = 1.35;

export interface SceneSize { width: number; height: number }

export function frameSceneCamera(camera: { x: number; y: number; scale: number }, stage: SceneSize) {
  const fit = Math.max(stage.width / SCENE_SPACE.width, stage.height / SCENE_SPACE.height);
  // Reserve room for drift/shake and their small rotation, so an
  // otherwise valid pan cannot show a black canvas edge on a phone.
  const margin = 16 + Math.max(stage.width, stage.height) * Math.sin(0.7 * Math.PI / 180) / 2;
  const scale = Math.max(fit * camera.scale,
    (stage.width + 2 * margin) / (SCENE_SPACE.width * SCENE_OVERSCAN),
    (stage.height + 2 * margin) / (SCENE_SPACE.height * SCENE_OVERSCAN));
  const limitX = Math.max(0, (SCENE_SPACE.width * SCENE_OVERSCAN * scale - stage.width) / 2 - margin);
  const limitY = Math.max(0, (SCENE_SPACE.height * SCENE_OVERSCAN * scale - stage.height) / 2 - margin);
  const range = Math.min(stage.width, stage.height) * 0.35;
  return {
    x: Math.max(-limitX, Math.min(limitX, camera.x * range)),
    y: Math.max(-limitY, Math.min(limitY, camera.y * range)),
    scale,
  };
}
