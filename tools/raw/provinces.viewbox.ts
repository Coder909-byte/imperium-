// Prototype province boundaries, hand-drawn in a fixed SVG viewBox
// (0 0 1000 620) against a plain linear lon/lat mapping — not any d3
// projection. Transcribed verbatim from the paths supplied for M1.
// `tools/unproject.ts` converts this into content/borders/provinces/*.json
// (real lon/lat GeoJSON) via the inverse of that mapping. Placeholder
// geometry per ADR 002 — replaced with real hand-authored paths later.

export interface RawProvince {
  name: string;
  latin: string;
  from: number;
  to?: number;
  c: [number, number];
  d: string;
}

export const VIEWBOX = { width: 1000, height: 620 };

// x = (lon + 12) * 17.24   →   lon = x / 17.24 - 12
// y = (60 - lat) * 16.25   →   lat = 60 - y / 16.25
export const FORWARD = {
  lonOffset: 12,
  lonScale: 17.24,
  latOrigin: 60,
  latScale: 16.25,
} as const;

export const rawProvinces: Record<string, RawProvince> = {
  latium: {
    name: "Latium",
    latin: "Ager Romanus",
    from: -500,
    to: -272,
    c: [424, 295],
    d: "M 408,290 L 428,284 L 440,296 L 428,306 L 410,302 Z",
  },
  italia: {
    name: "Italia",
    latin: "Italia",
    from: -272,
    to: 476,
    c: [440, 290],
    d: "M 358,252 L 400,242 L 420,238 L 440,250 L 448,272 L 462,292 L 480,308 L 502,320 L 524,324 L 517,336 L 494,326 L 476,320 L 470,342 L 477,358 L 462,354 L 452,332 L 434,318 L 410,298 L 386,276 L 362,266 Z",
  },
  sicilia: {
    name: "Sicilia",
    latin: "Provincia Siciliae",
    from: -241,
    to: 476,
    c: [447, 364],
    d: "M 421,361 L 440,351 L 474,352 L 472,374 L 442,373 Z",
  },
  sardinia: {
    name: "Sardinia",
    latin: "Sardinia et Corsica",
    from: -238,
    to: 456,
    c: [361, 322],
    d: "M 348,306 L 368,304 L 374,332 L 362,344 L 350,338 Z",
  },
  corsica: {
    name: "Corsica",
    latin: "Corsica",
    from: -238,
    to: 456,
    c: [363, 288],
    d: "M 353,274 L 368,276 L 372,300 L 358,302 Z",
  },
  hispania: {
    name: "Hispania",
    latin: "Hispaniae",
    from: -206,
    to: 472,
    c: [140, 325],
    d: "M 62,270 L 59,307 L 52,346 L 54,372 L 98,382 L 112,390 L 155,378 L 190,364 L 200,333 L 245,303 L 259,284 L 220,278 L 181,268 L 157,272 L 120,258 Z",
  },
  gallia: {
    name: "Gallia",
    latin: "Gallia Comata",
    from: -50,
    to: 476,
    c: [235, 215],
    d: "M 124,189 L 169,208 L 181,268 L 220,278 L 259,284 L 300,271 L 322,240 L 338,196 L 300,152 L 238,146 L 175,175 Z",
  },
  britannia: {
    name: "Britannia",
    latin: "Britannia",
    from: 43,
    to: 410,
    c: [168, 144],
    d: "M 109,163 L 121,124 L 141,106 L 158,100 L 166,120 L 190,134 L 231,143 L 220,165 L 176,178 L 140,175 Z",
  },
  raetia: {
    name: "Raetia & Pannonia",
    latin: "Prov. Danuvianae",
    from: -15,
    to: 476,
    c: [412, 218],
    d: "M 338,196 L 396,188 L 448,196 L 486,214 L 500,238 L 470,244 L 445,240 L 420,238 L 400,242 L 358,252 L 322,240 Z",
  },
  dalmatia: {
    name: "Dalmatia",
    latin: "Illyricum",
    from: -9,
    to: 480,
    c: [492, 266],
    d: "M 445,240 L 470,244 L 500,238 L 528,258 L 545,282 L 520,296 L 490,274 L 452,258 Z",
  },
  moesia: {
    name: "Moesia & Thracia",
    latin: "Moesia et Thracia",
    from: 46,
    c: [600, 272],
    d: "M 500,238 L 560,232 L 620,240 L 680,246 L 707,290 L 700,306 L 660,314 L 620,306 L 596,296 L 570,300 L 552,286 L 528,258 Z",
  },
  dacia: {
    name: "Dacia",
    latin: "Dacia Traiana",
    from: 106,
    to: 271,
    c: [625, 230],
    d: "M 560,232 L 600,212 L 650,214 L 690,226 L 700,244 L 680,246 L 620,240 Z",
  },
  graecia: {
    name: "Achaea",
    latin: "Achaea et Macedonia",
    from: -146,
    c: [602, 330],
    d: "M 570,300 L 606,300 L 626,312 L 632,338 L 618,360 L 600,362 L 592,336 L 578,318 Z",
  },
  asia: {
    name: "Asia",
    latin: "Provincia Asiae",
    from: -133,
    c: [750, 308],
    d: "M 707,290 L 745,282 L 790,286 L 800,318 L 762,338 L 720,330 L 700,306 Z",
  },
  anatolia: {
    name: "Cappadocia & Pontus",
    latin: "Cappadocia et Pontus",
    from: -25,
    c: [840, 316],
    d: "M 790,286 L 830,292 L 872,300 L 892,318 L 880,338 L 840,352 L 800,318 Z",
  },
  armenia: {
    name: "Armenia",
    latin: "Armenia",
    from: 114,
    to: 118,
    c: [936, 336],
    d: "M 892,322 L 936,312 L 978,330 L 968,356 L 922,358 L 900,342 Z",
  },
  syria: {
    name: "Syria",
    latin: "Provincia Syriae",
    from: -64,
    c: [862, 388],
    d: "M 828,388 L 852,360 L 880,344 L 906,370 L 898,410 L 866,428 L 838,420 L 818,402 Z",
  },
  judaea: {
    name: "Judaea",
    latin: "Iudaea",
    from: 6,
    c: [826, 436],
    d: "M 818,402 L 838,420 L 850,452 L 828,472 L 802,463 L 806,428 Z",
  },
  aegyptus: {
    name: "Aegyptus",
    latin: "Aegyptus",
    from: -30,
    c: [782, 494],
    d: "M 802,463 L 828,472 L 838,510 L 800,532 L 742,522 L 722,468 L 760,466 Z",
  },
  cyprus: {
    name: "Cyprus",
    latin: "Cyprus",
    from: -58,
    c: [784, 404],
    d: "M 762,404 L 800,394 L 808,404 L 786,414 Z",
  },
  creta: {
    name: "Creta",
    latin: "Creta et Cyrenaica",
    from: -69,
    c: [635, 404],
    d: "M 610,398 L 656,398 L 660,408 L 618,410 Z",
  },
  africa_prov: {
    name: "Africa",
    latin: "Africa Proconsularis",
    from: -146,
    to: 439,
    c: [430, 440],
    d: "M 300,372 L 383,377 L 424,404 L 434,440 L 500,470 L 534,479 L 584,442 L 596,468 L 540,506 L 460,492 L 380,452 L 300,414 L 262,398 Z",
  },
  mauretania: {
    name: "Mauretania",
    latin: "Mauretania",
    from: 44,
    to: 429,
    c: [195, 410],
    d: "M 90,423 L 107,393 L 180,395 L 250,382 L 300,372 L 306,404 L 262,412 L 180,432 L 112,442 Z",
  },
  mesopotamia: {
    name: "Mesopotamia",
    latin: "Mesopotamia",
    from: 116,
    to: 118,
    c: [950, 405],
    d: "M 902,362 L 950,372 L 1000,410 L 1000,448 L 962,442 L 906,398 Z",
  },
};
