// Deferred half of the particle system (PRD §4/§10, M5) — see
// CLAUDE.md's M5 bundle-split note. All six emitters are additive
// atmosphere ("arrive a beat late"), not structural to the first beat,
// so SceneEffects kicks this off right after construction alongside
// PostChain.loadAtmosphere() and never awaits either before the scene
// counts as interactive.
export interface ParticleSystemModule {
  EMITTER_CONFIGS: typeof import("./emitterConfigs").EMITTER_CONFIGS;
  resolveParticleCount: typeof import("./emitterConfigs").resolveParticleCount;
  ParticleField: typeof import("./ParticleField").ParticleField;
}

export async function loadParticleSystem(): Promise<ParticleSystemModule> {
  const [{ EMITTER_CONFIGS, resolveParticleCount }, { ParticleField }] = await Promise.all([
    import("./emitterConfigs"),
    import("./ParticleField"),
  ]);
  return { EMITTER_CONFIGS, resolveParticleCount, ParticleField };
}
