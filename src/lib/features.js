// Experimental, playtest-only gameplay toggles.
//
// Both of these are under trial and may be removed after a few games with real
// players. Flip either to `false` to disable it cleanly without touching the
// game logic; to remove a feature entirely, delete its flag here and follow the
// imports (game.js wager helpers, rooms.js writers, the Prompt/Voting/Game UI).
//
// - betting:      author backs their own answer, even-money, hidden until results.
// - intervention: a non-leader adds a 3rd answer to a flopped matchup as a
//                 visible risk-bet (≥6 players, top 2 barred, last-place-loses).
export const FEATURES = {
  betting: true,
  intervention: true,
}
