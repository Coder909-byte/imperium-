"""Encode temporary generated WAVs; never grant approval or edit content.

Usage: <temporary-venv>/bin/python scripts/encode-gallia-narration.py <temporary-output-dir>
Requires soundfile==0.13.1 (BSD-3-Clause) and its LGPL libsndfile, preparation only.
"""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import soundfile as sf

directory = Path(sys.argv[1])
generation = json.loads((directory / "recordings.json").read_text())
if len(generation["recordings"]) != 6:
    raise RuntimeError("Wait for all six complete recordings before encoding")
encoded = []
for recording in generation["recordings"]:
    source = directory / f'{recording["id"]}.wav'
    if hashlib.sha256(source.read_bytes()).hexdigest() != recording["wavSha256"]:
        raise RuntimeError("Generated source differs from its provenance")
    samples, sample_rate = sf.read(source)
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples * samples)))
    if sample_rate != 24000 or samples.ndim != 1 or rms < .001:
        raise RuntimeError("Expected non-silent mono 24kHz narration")
    gain = min(.12 / rms, .95 / peak)
    output = directory / f'{recording["id"]}.mp3'
    sf.write(output, samples * gain, sample_rate, format="MP3", subtype="MPEG_LAYER_III", compression_level=.5, bitrate_mode="VARIABLE")
    info = sf.info(output)
    if abs(info.duration * 1000 - recording["durationMs"]) > 1:
        raise RuntimeError("Encoded duration differs from the complete source")
    row = {"id": recording["id"], "bytes": output.stat().st_size,
           "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
           "durationMs": recording["durationMs"], "gain": gain, "sourcePeak": peak, "sourceRms": rms}
    encoded.append(row)
    print(row, flush=True)
(directory / "encodings.json").write_text(json.dumps({
    "soundfile": sf.__version__, "libsndfile": sf.__libsndfile_version__,
    "codec": "MP3 VBR mono 24000Hz", "compressionLevel": .5, "recordings": encoded,
}, indent=2) + "\n")
print("Total narration bytes:", sum(row["bytes"] for row in encoded))
