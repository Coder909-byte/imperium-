// A hand-rolled vignette (PRD §4, M5) — pixi-filters@6.x (the pixi.js v8
// compatible line) dropped the VignetteFilter that existed in its older
// v3/v4 API, and pixi.js core doesn't have one either. Rather than pull
// in a filter bundle that has one (e.g. OldFilmFilter, which couples it
// to sepia/scratches/dust we don't want) this follows the same call
// noise.ts and sweepTween.ts already made: a small effect is cheaper to
// write correctly than to find a dependency for. See docs/adr for the
// decision writeup.
//
// GLSL-only (a `glProgram`, no `gpuProgram`) is a deliberate scope cut,
// not an oversight: SceneRenderer.ts pins `preference: "webgl"`
// explicitly, so there is no live WebGPU path to also write shader code
// for. Per Filter's own docs, a filter missing a gpuProgram simply
// renders as a no-op under whichever renderer needs it — safe today,
// and a one-line flag for whoever changes that renderer preference.
import { Filter, GlProgram, UniformGroup, defaultFilterVert } from "pixi.js";

// Distance-from-centre darken in the filtered texture's own UV space
// (0..1), not corrected for the stage's aspect ratio — the letterboxed
// player is already close to a fixed widescreen ratio, so an uncorrected
// circle reads as an intentional soft frame rather than a visible
// ellipse. Flagged here rather than silently "fixed" with an aspect
// uniform this milestone doesn't need.
const VIGNETTE_FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform float uRadius;
uniform float uSoftness;
uniform float uIntensity;
uniform sampler2D uTexture;

void main()
{
    vec4 color = texture(uTexture, vTextureCoord);
    float dist = length(vTextureCoord - vec2(0.5));
    float falloff = smoothstep(uRadius, uRadius - uSoftness, dist);
    float darken = 1.0 - uIntensity * (1.0 - falloff);

    if (color.a > 0.0) {
        color.rgb /= color.a;
    }
    color.rgb *= darken;
    color.rgb *= color.a;

    finalColor = color;
}
`;

export interface VignetteFilterOptions {
  /** Where the darken starts, as a fraction of half the frame's diagonal-ish UV distance. */
  radius?: number;
  /** How wide the falloff band is — larger reads as a softer, less visible edge. */
  softness?: number;
  /** 0 = no darkening, 1 = fully black at the corners. */
  intensity?: number;
}

export class VignetteFilter extends Filter {
  static readonly DEFAULT_OPTIONS: Required<VignetteFilterOptions> = {
    radius: 0.75,
    softness: 0.45,
    intensity: 0.35,
  };

  constructor(options: VignetteFilterOptions = {}) {
    const merged = { ...VignetteFilter.DEFAULT_OPTIONS, ...options };
    const glProgram = GlProgram.from({
      vertex: defaultFilterVert,
      fragment: VIGNETTE_FRAG,
      name: "vignette-filter",
    });

    super({
      glProgram,
      resources: {
        vignetteUniforms: new UniformGroup({
          uRadius: { value: merged.radius, type: "f32" },
          uSoftness: { value: merged.softness, type: "f32" },
          uIntensity: { value: merged.intensity, type: "f32" },
        }),
      },
    });
  }

  get radius(): number {
    return this.resources.vignetteUniforms.uniforms.uRadius;
  }

  set radius(value: number) {
    this.resources.vignetteUniforms.uniforms.uRadius = value;
  }

  get softness(): number {
    return this.resources.vignetteUniforms.uniforms.uSoftness;
  }

  set softness(value: number) {
    this.resources.vignetteUniforms.uniforms.uSoftness = value;
  }

  get intensity(): number {
    return this.resources.vignetteUniforms.uniforms.uIntensity;
  }

  set intensity(value: number) {
    this.resources.vignetteUniforms.uniforms.uIntensity = value;
  }
}
