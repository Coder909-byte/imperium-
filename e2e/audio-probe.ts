import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __m10Audio: () => {
      active: { loop: boolean; seconds: number; gain: number | null }[];
      starts: { loop: boolean; seconds: number }[];
    };
  }
}

export async function installAudioProbe(page: Page) {
  await page.addInitScript(() => {
    const active = new Set<AudioBufferSourceNode>();
    const gains = new WeakMap<AudioNode, GainNode>();
    const starts: { loop: boolean; seconds: number }[] = [];
    const connect = AudioNode.prototype.connect;
    const start = AudioBufferSourceNode.prototype.start;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioNode.prototype.connect = function (this: AudioNode, destination: AudioNode | AudioParam, output = 0, input = 0) {
      if (destination instanceof AudioNode) {
        if (destination instanceof GainNode) gains.set(this, destination);
        return Reflect.apply(connect, this, [destination, output, input]);
      }
      Reflect.apply(connect, this, [destination, output]);
    } as typeof connect;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      start.apply(this, args);
      if (!this.buffer || this.buffer.duration < 0.1) return;
      active.add(this);
      starts.push({ loop: this.loop, seconds: this.buffer.duration });
      this.addEventListener("ended", () => active.delete(this));
    };
    AudioBufferSourceNode.prototype.stop = function (...args: Parameters<typeof stop>) {
      stop.apply(this, args);
      active.delete(this);
    };
    window.__m10Audio = () => ({ starts, active: [...active].map(source => ({
      loop: source.loop, seconds: source.buffer?.duration ?? 0, gain: gains.get(source)?.gain.value ?? null,
    })) });
  });
  // Audio checks never need account progress or a shared-database write.
  await page.route("**/api/progress/scene", route => route.fulfill({ json: { saved: false } }));
}

export const audioState = (page: Page) => page.evaluate(() => window.__m10Audio());
