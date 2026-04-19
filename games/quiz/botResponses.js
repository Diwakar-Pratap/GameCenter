const WRONG_TAUNTS = [
  "Did you even read the question? 🤦‍♂️",
  "Oof, that was painfully wrong. 😬",
  "Is your brain on vacation? 🏖️",
  "I've seen potatoes guess better than that. 🥔",
  "Nice try, but completely wrong. 🙃"
];

const RIGHT_TAUNTS = [
  "Wow, look who has a functioning brain! 🧠✨",
  "Finally, a correct answer. Took you long enough. 🙄",
  "Is someone googling the answers? 📱👀",
  "Correct! But I bet you just guessed. 🎲",
  "Right on! Nerd alert! 🚨🤓"
];

const HINTS = [
  "💡 *Hint:* The faster you answer correctly, the more points you get!",
  "💡 *Hint:* Don't copy someone else's wrong answer!",
  "💡 *Hint:* Type just the letter A, B, C, or D to lock in your guess.",
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  // ── Lobby ───────────────────────────────────────────────────────────────────
  gameCreated: (host) =>
    `🧠 *TRIVIA NIGHT LOBBY STARTED!* 🧠\n\n` +
    `👑 Host: @${host}\n\n` +
    `Type */join* to enter the game and prove your intelligence.\n` +
    `Host sends */start* when everyone is locked in! 🚀`,

  playerJoined: (name, count) =>
    `✅ *${name}* stepped up to the podium! (${count} player${count !== 1 ? "s" : ""} so far)\n${random(HINTS)}`,

  alreadyJoined: (name) => `⚠️ ${name}, you are already in the lobby! Calm down.`,

  noGameRunning: () =>
    `❌ No quiz is running.\nSend */quiz* to create one!`,

  gameAlreadyRunning: () =>
    `⚠️ A quiz is already in progress! Let them finish embarrassing themselves first.`,

  notEnoughPlayers: () =>
    `⚠️ Need at least *1 player* to start. We can do a solo trial run.\nSend */join* to enter!`,

  onlyHostCanStart: (host) =>
    `⚠️ Only the host (*${host}*) can send */start*.`,

  // ── Gameplay ─────────────────────────────────────────────────────────────
  announceTopics: (topicsMapping) => {
      let msg = `🗳️ *TIME TO VOTE FOR A TOPIC!* 🗳️\n\n`;
      msg += `What kind of trivia do you want to play?\n\n`;
      for (const [letter, name] of Object.entries(topicsMapping)) {
          msg += `*${letter})* ${name}\n`;
      }
      msg += `\n⏳ _You have 15 seconds! Reply with the letter of your choice._`;
      return msg;
  },

  topicWinner: (winningTopic, isTie) => {
      if (isTie) {
         return `⚖️ It was a tie! The bot randomly selected: *${winningTopic}*\n\nLet's go! 🚀`;
      }
      return `🏆 The group has spoken! Topic selected: *${winningTopic}*\n\nLet's go! 🚀`;
  },

  announceQuestion: (qData, totalQ, currentQ) =>
    `📝 *Question ${currentQ} of ${totalQ}*\n\n` +
    `*${qData.question}*\n\n` +
    `A) ${qData.options.A}\n` +
    `B) ${qData.options.B}\n` +
    `C) ${qData.options.C}\n` +
    `D) ${qData.options.D}\n\n` +
    `⏳ _You have 20 seconds! Reply with A, B, C, or D._`,

  playerGuessed: (name) =>
    `🔒 *${name}* locked in their answer!`,

  // ── Results ──────────────────────────────────────────────────────────────
  questionResults: (qData, answerStats, leaderboardText) => {
    let msg = `⏰ *TIME'S UP!*\n\n`;
    msg += `The correct answer was: *${qData.correct}) ${qData.options[qData.correct]}*\n\n`;
    
    msg += `*How everyone did:*\n`;
    for (const stat of answerStats) {
      if (stat.isCorrect) {
        msg += `✅ *${stat.name}* guessed ${stat.guess} (+${stat.points} pts)\n  ↳ _${random(RIGHT_TAUNTS)}_\n`;
      } else {
        msg += `❌ *${stat.name}* guessed ${stat.guess} (+0 pts)\n  ↳ _${random(WRONG_TAUNTS)}_\n`;
      }
    }
    
    if (answerStats.length === 0) {
      msg += `Nobody guessed anything! *Crickets* 🦗\n`;
    }

    msg += `\n${leaderboardText}\n`;
    msg += `\n⏭️ _Next question starting in 5 seconds..._`;
    return msg;
  },

  finalResults: (leaderboardText, winner) =>
    `🏆 *QUIZ FINISHED!* 🏆\n\n` +
    `🥇 The winner is: *${winner || "Nobody"}*!\n\n` +
    `${leaderboardText}\n\n` +
    `Send */quiz* to play another round!`,

  // ── Utils ─────────────────────────────────────────────────────────────────
  formatLeaderboard: (playersScoreMap) => {
    let lines = [`📊 *CURRENT LEADERBOARD*`];
    // Sort players by score
    const sorted = [...playersScoreMap.entries()].sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < sorted.length; i++) {
       const [name, score] = sorted[i];
       const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅";
       lines.push(`${medal} ${name}: ${score} pts`);
    }
    return lines.join("\n");
  },

  help: () =>
    `🧠 *Quiz Bot* — Commands:\n\n` +
    `*/quiz* — Start a new Quiz lobby\n` +
    `*/join* — Join the lobby\n` +
    `*/start* — Host begins the questions\n` +
    `*/stop* — End the game early\n`
};
