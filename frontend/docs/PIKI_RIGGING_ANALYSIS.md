# Piki rigging analysis (2026-11-10)

## Current decision

The live intro deliberately does **not** render `PikiRig` or any `rig/` asset.
It uses the verified `basicGreeting` full PNG while retaining the existing
intro sequence, speech bubble, sound option, and play button. The rig files are
kept only for analysis and must not be treated as approved production art.

## Why the previous rig failed

The generated assets are independent crops, not parts from one registered
master canvas. Their source sizes and CSS placement cannot preserve Piki's
original anatomy:

| Part | Source size | Live rig placement that caused the fault |
| --- | ---: | --- |
| body | 1383 × 1137 | `width: 52%`, `left: 25%`, bottom anchor |
| head shell | 1322 × 1190 | `width: 86%`, `left: 7%`, top anchor |
| wave arm | 1199 × 1312 | `width: 36%`, pivot `28% 80%` |
| reach arm | 1774 × 887 | `width: 59%`, pivot `17% 58%`, above head |
| open eyes | 1402 × 1122 | scaled to `46%` of the head container |
| blink eyes | 1536 × 1024 | scaled to `46%` of the head container |
| closed/open mouth | 1448 × 1086 | scaled to `22%` of the head container |

Specific conflicts:

- The head shell contains a transparent/softly edged facial opening. The CSS
  white oval behind it could not restore the lost opaque face surface, leaving
  a blurred or hollow-looking center.
- The reach arm used a wide 2:1 crop and was layered at `z-index: 5`, above the
  head at `z-index: 3`; it could therefore cross the face instead of connecting
  at a shoulder.
- The wave arm was behind the head while the reach arm was in front, so the two
  limbs had incompatible depth rules.
- Eye and mouth crops were not registered to the head shell. Their whitespace,
  scale, and origin differ, so CSS percentages do not represent facial
  coordinates.
- The previous full-frame bridges (`introReach` and `introTalk`) were placed at
  `z-index: 9` over the separate rig. Their different foot/body anchors and
  aspect ratios caused a visible pose collision during crossfade.

## Minimum art package required before another rig attempt

Do not generate independent crops again. Use one shared transparent master
canvas (for example 2048 × 2048) and preserve its coordinates in every export.

1. `body-base`: torso, legs, neckerchief, and yellow star; no head or arms.
2. `head-base`: complete opaque head, ears, blush, pink tuft, and a clean face
   surface; no missing/soft facial region.
3. `arm-left` and `arm-right`: each with a documented shoulder pivot and an
   overlap tab that is hidden beneath the torso.
4. `eyes-open`, `eyes-blink`, `mouth-closed`, and `mouth-open`: transparent
   overlays registered to the identical master canvas, not tight crops.
5. A documented layer order and pivot table, plus a neutral assembled preview
   that can be compared pixel-for-pixel with `PIKI_MASTER_A.png`.

## Safe validation order

1. Assemble the neutral character with no transforms and visually approve it.
2. Rotate one arm by a few degrees around its documented shoulder pivot.
3. Add a small head rotation.
4. Add blink overlays.
5. Add mouth switching.

At every step, compare against the approved neutral preview. Do not add
full-frame crossfades, hops, or multiple animated limbs until the preceding
step has been browser-verified at desktop and mobile sizes.
