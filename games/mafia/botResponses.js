/**
 * botResponses.js
 * ───────────────
 * Message templates for the Mafia Bot.
 */

const NIGHT_TAUNTS = [
  "Sleep with one eye open... 👁️",
  "It's awfully quiet tonight. Too quiet... 🤫",
  "Lock your doors, the Mafia is prowling. 🚪🔒",
  "Who will not wake up tomorrow? 💀",
];

const ELIMINATION_TAUNTS = [
  "A tragic loss for the town. 🥀",
  "Their cries were unheard. 😱",
  "Another one bites the dust. ⚰️",
  "The town is getting smaller... 📉",
];

const HELP_HINTS = [
  "💡 *Hint:* Pay attention to who is voting for whom!",
  "💡 *Hint:* Mafia members will try to blend in. Watch for unusual silence or over-defensiveness.",
  "💡 *Hint:* If someone is quick to accuse without evidence, suspicious... 🤔",
  "💡 *Hint:* Don't trust anyone too quickly. Even your closest ally could be Mafia! 🗡️"
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  // ── Lobby ───────────────────────────────────────────────────────────────────
  gameCreated: (host) =>
    `🕶️ *Mafia Game Started!*\n\n` +
    `👑 Host: @${host}\n\n` +
    `Type */join* to enter the game.\n` +
    `Need at least *3 players* to make it interesting.\n` +
    `Host sends */start* when everyone is in! 🕵️‍♂️`,

  playerJoined: (name, count) =>
    `✅ *${name}* joined the town! (${count} player${count !== 1 ? "s" : ""} so far)`,

  alreadyJoined: (name) => `⚠️ ${name}, you already joined!`,

  noGameRunning: () =>
    `❌ No game is running.\nSend */startgame* to create one!`,

  gameAlreadyRunning: () =>
    `⚠️ A game is already in progress! Wait for it to finish.`,

  notEnoughPlayers: () =>
    `⚠️ Need at least *3 players* to start.\nSend */join* to enter!`,

  onlyHostCanStart: (host) =>
    `⚠️ Only the host (*${host}*) can send */start*.`,

  notInGame: (name) =>
    `⚠️ ${name}, you aren't in this town.\nWait for the next game!`,

  // ── Roles & Night Phase ───────────────────────────────────────────────────
  rolesAssigned: () =>
    `🎭 *Roles have been secretly assigned via DM!* Check your private messages.\n\n` +
    `🌙 *Night Phase Begins!*\n` +
    `The town goes to sleep. 😴\n` +
    `Mafia, look at your DMs to choose a target.\n\n` +
    random(NIGHT_TAUNTS),

  dmRoleMafia: (playersList) =>
    `😈 *YOU ARE THE MAFIA.*\n\n` +
    `Your goal: Eliminate the villagers without getting caught.\n` +
    `It is Night Phase. Reply with the *number* of the player you want to eliminate:\n\n` +
    playersList,

  dmRoleVillager: () =>
    `🧑‍🌾 *YOU ARE A VILLAGER.*\n\n` +
    `Your goal: Find out who the Mafia is and vote them out during the Day Phase.\n` +
    `For now, sleep tight... 🌙`,

  dmWaitDay: () => `⏳ Target confirmed. Waiting for the sun to rise...`,
  dmInvalidTarget: () => `❌ Invalid target number. Please reply with a valid number from the list.`,
  dmNotMafia: () => `🤫 You are a Villager! Just sleep to survive the night.`,
  dmNotNight: () => `☀️ It is daytime. You cannot kill right now!`,

  // ── Day Phase ─────────────────────────────────────────────────────────────
  dayBeginsWithDeath: (victim) =>
    `☀️ *Day Phase Begins!*\n\n` +
    `Tragedy has struck the town! 😱\n` +
    `*${victim}* was found eliminated by the Mafia.\n` +
    `${random(ELIMINATION_TAUNTS)}\n\n` +
    `🗣️ Discuss! Who is suspicious?\n` +
    `Type */vote @username* to cast your vote.\n\n` +
    random(HELP_HINTS),

  dayBeginsNoDeath: () =>
    `☀️ *Day Phase Begins!*\n\n` +
    `A miracle! Nobody was eliminated last night. 🙌\n\n` +
    `🗣️ Discuss! Who is suspicious?\n` +
    `Type */vote @username* to cast your vote.\n\n` +
    random(HELP_HINTS),

  voteNotDayPhase: () => `☀️ The sun hasn't risen yet! You can only vote during the Day.`,

  // ── Voting ────────────────────────────────────────────────────────────────
  voteCast: (voter, target, votesNeeded) =>
    `🗳️ *${voter}* voted to eliminate *${target}*!\n` +
    `(${votesNeeded} votes cast out of living players.)`,

  voteInvalid: (name) =>
    `❌ *${name}* is not a valid target (either not playing or already eliminated).`,

  voteSelf: () => `🤦 You can't vote for yourself! That's just sad.`,

  voteEliminated: (victim) =>
    `⚖️ *Town Decision!*\n\n` +
    `The town has agreed to eliminate *${victim}*.\n` +
    `Let's see the aftermath...\n`,

  voteTie: () =>
    `⚖️ *Town Decision!*\n\n` +
    `The votes were tied! Nobody is eliminated today.\n`,

  // ── Win Conditions ────────────────────────────────────────────────────────
  mafiaWin: (mafiaMembers) =>
    `😈 *THE MAFIA WINS!*\n\n` +
    `The Mafia overpowered the town. The survivors stand no chance.\n` +
    `Mafia Member(s): *${mafiaMembers.join(", ")}*\n\n` +
    `Play again? Send */startgame* 🎮`,

  villagerWin: () =>
    `🧑‍🌾 *THE VILLAGERS WIN!*\n\n` +
    `The Mafia threat has been eradicated! Peace returns to the town.\n\n` +
    `Play again? Send */startgame* 🎮`,

  // ── Utils ─────────────────────────────────────────────────────────────────
  playersList: (alive, eliminated, phase) => {
    const lines = [`👥 *Living Players:*`];
    alive.forEach(p => lines.push(`  ✅ ${p}`));
    lines.push(`\n☠️ *Eliminated Players:*`);
    eliminated.forEach(p => lines.push(`  🪦 ${p}`));
    lines.push(`\n🕒 Current Phase: *${phase.toUpperCase()}*`);
    return lines.join("\n");
  },

  help: () =>
    `🤖 *Mafia Bot* — Commands:\n\n` +
    `*/startgame* — Open a town\n` +
    `*/join* — Join the town\n` +
    `*/start* — Host starts game\n` +
    `*/vote @name* — Vote during the day\n` +
    `*/players* — See alive/dead players\n` +
    `*/leaderboard* — View hall of fame\n` +
    `*/endgame* — Host ends the game early\n\n` +
    random(HELP_HINTS),

  leaderboard: (lbData) => {
    let msg = `🏆 *Mafia Leaderboard* 🏆\n\n`;
    if (!lbData || Object.keys(lbData).length === 0) {
      msg += "No games played yet!";
      return msg;
    }
    for (const [mode, count] of Object.entries(lbData)) {
      msg += `🎖️ ${mode}: ${count} win(s)\n`;
    }
    return msg;
  }
};
