# LXP treasure chest reward-gated reveal

## Scope

The secret-land treasure display was changed so the chest is closed when there is no newly earned badge. Existing earned badges are still available in the badge book and are not replayed as a new reward on initial entry.

## Implementation

- `TreasureDisplay` tracks the earned concept IDs that were present on the previous render and uses the separate `pikipick.secret-treasure-progress.v1` marker when the dashboard is remounted after a game result.
- Only a newly added earned concept opens the chest and starts the reveal.
- The actual earned badge is rendered at a larger size, starts behind the chest-front mask, and rises from the chest center.
- After the reward animation, the display returns to the closed state with no floating badge.
- The existing open treasure PNG was preserved. There is no separate closed-chest PNG in the project, so the closed state uses the lower chest artwork with a scoped lid treatment.
- The badge collection page uses equal outer padding, and its back-button row has equal top and bottom spacing.

## Verification

- `npm.cmd run test`: 13 files, 71 tests passed.
- `npm.cmd run build`: passed.
- Browser check at `http://127.0.0.1:5173/play/world`: no-record state rendered `is-closed` and contained no treasure badge slot.

## Remaining limitation

A dedicated transparent closed-chest PNG would provide a more exact closed-state illustration than the current scoped lid treatment.
