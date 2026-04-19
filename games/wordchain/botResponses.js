module.exports = {
   gameCreated: (hostName) => 
      `🧩 *WORD CHAIN GAME* 🧩\n\n` +
      `${hostName} has started the game!\n` +
      `Rules:\n` +
      `1. Enter an English word OR an Indian Movie name.\n` +
      `2. It must start with the *last letter* of the previous word.\n` +
      `3. No repeating words!\n\n` +
      `Type */start* when ready.`,

   started: (startWord, lastLetter) =>
      `🚀 *Let's go!*\n\n` +
      `Starting word: *${startWord}*\n\n` +
      `Next word must start with: *${lastLetter.toUpperCase()}*\n` +
      `Anyone can guess!`,
      
   acceptedWord: (player, word, meaning, nextLetter, pts) =>
      `✅ *Accepted!* (+${pts} pts to @${player})\n\n` +
      `📖 *${word.toUpperCase()}*: ${meaning}\n\n` +
      `Next letter: *${nextLetter.toUpperCase()}*`,

   acceptedMovie: (player, word, nextLetter, pts) =>
      `🎬 *Movie Accepted!* (+${pts} pts to @${player})\n\n` +
      `*${word.toUpperCase()}*\n\n` +
      `Next letter: *${nextLetter.toUpperCase()}*`,

   rejectedWrongLetter: (player, word, reqLetter) =>
      `❌ Uh oh @${player}!\n\n*${word.toUpperCase()}* doesn't start with *${reqLetter.toUpperCase()}*.\nTry again!`,

   rejectedRepeat: (player, word) =>
      `♻️ Nice try @${player}, but *${word.toUpperCase()}* was already used!\nBe original! Try again.`,

   rejectedFakeWord: (player, word) =>
      `🤡 Are you making things up @${player}?\n\n*${word.toUpperCase()}* is NOT an English dictionary word or a known Indian movie! Use a real word!`,

   leaderboard: (lbText) =>
      `🏆 *Scores* 🏆\n${lbText}`,

   stopped: (hostName) =>
      `🛑 *Word Chain ended by ${hostName}.*\n\nType /game to play something else!`,

   timeUp: (lbText) =>
      `⏳ *TIME IS UP! 60 SECONDS ARE OVER!*\n\n` +
      `Great job, word smiths!\n\n` +
      `*Current Leaderboard:*\n${lbText}\n\n` +
      `Type */start* to play another 60-second round and keep your points growing, or */stop* to end the game completely!`
};
