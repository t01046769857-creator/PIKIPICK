PIKIPICK EXPLORER SOURCE ASSETS

- piki-explorer-run-right-source.png: generated transparent RGBA right-facing side-view source.
- piki-explorer-run-left-source.png: generated transparent RGBA left-facing side-view source.
- piki-explorer-motion-reference-sheet.png: sprite/reference SHEET, RGB with visible checkerboard and labels; NOT transparent, NOT directly game-ready.
- piki-explorer-original-user-reference.png: original reference uploaded by user.

These are 4 source materials, NOT nine validated game sprites.
Codex should inspect alpha, normalize each asset's canvas and character scale, derive/verify foot anchors separately, and only slice the motion sheet when boundaries/background can be cleanly separated. Do NOT treat checkerboard pixels as transparency. If extraction is poor, request missing individual frames rather than applying flawed sprites.
