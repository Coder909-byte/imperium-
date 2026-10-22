# 010. Separate historical map availability from authored scene availability

## Context

The atlas has 24 provinces and four historical held sets, but only Gallia has authored campaign content. Every held province advertised “open scene”; the initial 350 BC map exposed only unauthored Latium. A working route to an unavailable campaign therefore looked like broken playback. The `africa_prov` ID also failed the route metadata loader's hyphen-only allowlist. The two non-province scene fixtures do not constitute additional campaigns.

## Decision

Compute scene availability in `app/atlas` from validated, filename-matching region content, passing only small preview metadata into the content-independent SVG engine. Authored campaigns have a solid outline and an explicit scene-preview action. Unauthored provinces retain their historical held appearance, gain a dashed outline and a Coming soon action, and open an accessible named unavailable state. An always-visible preview catalog makes Gallia discoverable from the initial map, explicitly labelling its scene date as 52 BC while leaving the selected map era unchanged. Accept existing underscore IDs, reject path traversal, return 404 for unknown provinces, and fail malformed authored JSON instead of quietly treating it as unauthored.

## Consequences

Historical territorial coverage and campaign production progress no longer imply each other. Gallia remains labelled a preview while its art/audio and review gates are unfinished. No new campaign or asset approval is invented. The catalog derives from real province content, so development fixtures stay outside it and a new authored campaign becomes discoverable without an engine import from `content/`. The documented Gallia held-date discrepancy remains a historical review item; this decision does not rewrite that evidence.
