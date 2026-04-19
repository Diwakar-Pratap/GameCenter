/**
 * botResponses.js
 * ───────────────
 * All message templates for the Bomb Defusal WhatsApp Group Bot.
 * Emojis render natively in WhatsApp — no escaping needed.
 */

const PASS_TAUNTS = [
  "😅 Hot potato! Hot potato!",
  "🏃 Run @{to}, RUN!",
  "😱 @{to} now holds the bomb!",
  "😬 Good luck @{to}... you'll need it.",
  "💨 Passed like lightning to @{to}!",
  "🫳 Catch! @{to} has it now!",
  "🤯 @{to} is sweating bullets!",
];

const BOOM_MESSAGES = [
  "💥 *BOOOOM!*",
  "🔥 *KABOOM!*",
  "💣 *BOOM! Direct hit!*",
  "🧨 *THE BOMB WENT OFF!*",
  "☢️ *DETONATION! Total destruction!*",
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  // ── Lobby ───────────────────────────────────────────────────────────────────

  gameCreated: (host) =>
    `💣 *Bomb Defusal Game Started!*\n\n` +
    `👑 Host: @${host}\n\n` +
    `Type */join* to enter the game.\n` +
    `Need at least *2 players*.\n` +
    `Host sends */start* when everyone is in! 🎮`,

  playerJoined: (name, count) =>
    `✅ *${name}* joined the game! (${count} player${count !== 1 ? "s" : ""} so far)`,

  alreadyJoined: (name) => `⚠️ ${name}, you already joined!`,

  noGameRunning: () =>
    `❌ No game is running.\nSend */startgame* to create one!`,

  gameAlreadyRunning: () =>
    `⚠️ A game is already in progress! Wait for it to finish.`,

  notEnoughPlayers: () =>
    `⚠️ Need at least *2 players* to start.\nSend */join* to enter!`,

  onlyHostCanStart: (host) =>
    `⚠️ Only the host (*${host}*) can send */start*.`,

  notInGame: (name) =>
    `⚠️ ${name}, you haven't joined this game.\nType */join* next round!`,

  // ── Round Start ─────────────────────────────────────────────────────────────

  roundStart: (holder, seconds, players) => {
    const list = players.map((p) => `  • ${p}`).join("\n");
    return (
      `🎮 *Game Begins!*\n\n` +
      `👥 Players:\n${list}\n\n` +
      `💣 The bomb is with *${holder}*!\n` +
      `⏱️ Timer: *${seconds} seconds*!\n\n` +
      `Type */pass @username* to pass it! 😰`
    );
  },

  // ── Passing ─────────────────────────────────────────────────────────────────

  bombPassed: (from, to, secondsLeft) => {
    const taunt = random(PASS_TAUNTS).replace("@{to}", to);
    return (
      `💣 *${from}* passed the bomb to *${to}*!\n` +
      `⏱️ *${secondsLeft} second${secondsLeft !== 1 ? "s" : ""} left!*\n\n` +
      taunt
    );
  },

  notYourBomb: (holder) =>
    `⛔ It's not your bomb! *${holder}* is holding it right now.`,

  invalidTarget: (name) =>
    `❌ *${name}* is not in this game (or already eliminated).\nUse */players* to see who's active.`,

  passToSelf: () => `🤦 You can't pass the bomb to yourself!`,

  passFormatError: () =>
    `⚠️ Wrong format!\nUse: */pass @username*\nMention the person with @`,

  // ── Explosion ───────────────────────────────────────────────────────────────

  explosion: (victim) =>
    `${random(BOOM_MESSAGES)}\n\n` +
    `☠️ *${victim}* couldn't pass it in time and is *ELIMINATED!*\n\n` +
    `The dust settles... who survives? 👀`,

  nextRound: (newHolder, seconds, remaining) => {
    const survivors = remaining.join(", ");
    return (
      `🔄 *Next Round!*\n\n` +
      `👥 Survivors: ${survivors}\n\n` +
      `💣 Bomb reassigned to *${newHolder}*!\n` +
      `⏱️ *${seconds} seconds* on the clock!\n\n` +
      `Keep passing! 😤`
    );
  },

  // ── Win / Draw ──────────────────────────────────────────────────────────────

  winner: (name) =>
    `🏆 *GAME OVER!*\n\n` +
    `🥳 *${name}* is the last one standing!\n\n` +
    `Congratulations, you defused the pressure! 💪\n\n` +
    `Play again? Send */startgame* 🎮`,

  draw: () =>
    `💥 *GAME OVER — DRAW!*\n\n` +
    `The bomb took everyone out at once. Nobody survives! 🫠\n\n` +
    `Play again? Send */startgame* 🎮`,

  // ── Players list ────────────────────────────────────────────────────────────

  playersList: (active, eliminated, holder) => {
    const lines = ["👥 *Players:*\n"];
    active.forEach((p) => {
      const tag = p === holder ? " 💣" : "";
      lines.push(`  ✅ ${p}${tag}`);
    });
    eliminated.forEach((p) => lines.push(`  ☠️ ${p} (eliminated)`));
    return lines.join("\n");
  },

  // ── Help ────────────────────────────────────────────────────────────────────

  help: () =>
    `🤖 *Bomb Defusal Bot* — Commands:\n\n` +
    `*/startgame* — Create a new game\n` +
    `*/join* — Join the current game\n` +
    `*/start* — Start the game (host only)\n` +
    `*/pass @name* — Pass the bomb!\n` +
    `*/players* — See who's alive\n` +
    `*/endgame* — End current game (host only)\n`,
};
