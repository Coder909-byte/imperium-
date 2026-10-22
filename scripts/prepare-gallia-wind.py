"""Prepare the owner-approved wind1 recording; no external Python packages.

  python3 scripts/prepare-gallia-wind.py wind1.wav wind-plains.wav

The output still needs an audible loop/mix review. This script cannot
grant rights approval or change the production manifest.
"""

import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import sys
import wave


def prepare(source: Path, destination: Path) -> dict[str, object]:
    with wave.open(str(source), "rb") as recording:
        if (recording.getnchannels(), recording.getsampwidth(), recording.getframerate()) != (1, 2, 44100):
            raise ValueError("Expected the original mono 16-bit PCM at 44100 Hz.")
        frames = array.array("h", recording.readframes(recording.getnframes()))
    if sys.byteorder != "little":
        frames.byteswap()
    rate = 22050
    overlap = 2 * rate
    length = 12 * rate
    taps = 63
    cutoff = 0.225
    coefficients = []
    for index in range(taps):
        distance = index - (taps - 1) / 2
        sinc = 2 * cutoff if distance == 0 else math.sin(2 * math.pi * cutoff * distance) / (math.pi * distance)
        window = 0.42 - 0.5 * math.cos(2 * math.pi * index / (taps - 1)) + 0.08 * math.cos(4 * math.pi * index / (taps - 1))
        coefficients.append(sinc * window)
    total = sum(coefficients)
    coefficients = [value / total for value in coefficients]
    if len(frames) < (length + overlap) * 2 + taps:
        raise ValueError("At least fourteen seconds of source audio are required.")
    # Anti-alias before 2:1 decimation; no unfiltered sample dropping.
    resampled = [sum(frames[2 * index + tap] * coefficient for tap, coefficient in enumerate(coefficients)) for index in range(length + overlap)]
    # Finish on the sample immediately before the output's first source
    # sample. The wrap then follows a real source transition, not a splice.
    samples = resampled[overlap:length]
    for index in range(overlap):
        phase = index / (overlap - 1) * math.pi / 2
        samples.append(resampled[length + index] * math.cos(phase) + resampled[index] * math.sin(phase))
    rms = math.sqrt(sum(value * value for value in samples) / len(samples))
    if rms == 0:
        raise ValueError("The source segment is silent.")
    gain = 32768 * 10 ** (-30 / 20) / rms
    output = array.array("h", (round(value * gain) for value in samples))
    if sys.byteorder != "little":
        output.byteswap()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(destination), "wb") as loop:
        loop.setnchannels(1)
        loop.setsampwidth(2)
        loop.setframerate(rate)
        loop.writeframes(output.tobytes())
    # Read the written PCM for measured values rather than an ideal gain.
    with wave.open(str(destination), "rb") as loop:
        measured = array.array("h", loop.readframes(loop.getnframes()))
    if sys.byteorder != "little":
        measured.byteswap()
    pcm_rms = math.sqrt(sum(value * value for value in measured) / len(measured))
    differences = [abs(measured[index] - measured[index - 1]) for index in range(1, len(measured))]
    return {
        "file": str(destination), "bytes": destination.stat().st_size,
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "durationSeconds": len(measured) / rate, "sampleRate": rate,
        "channels": 1, "bitsPerSample": 16, "crossfadeSeconds": 2,
        "resample": "2:1 decimation, 63-tap Blackman-windowed sinc, cutoff 0.225 cycles/source sample, unit DC gain",
        "gainDb": 20 * math.log10(gain),
        "rmsDbfs": 20 * math.log10(pcm_rms / 32768),
        "peakDbfs": 20 * math.log10(max(abs(value) for value in measured) / 32768),
        "clippedSamples": sum(abs(value) >= 32767 for value in measured),
        "wrapStepPcm": abs(measured[0] - measured[-1]),
        "maxInternalStepPcm": max(differences),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    arguments = parser.parse_args()
    print(json.dumps(prepare(arguments.source, arguments.destination), indent=2))
