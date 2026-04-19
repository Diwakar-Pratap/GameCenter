module.exports = {
   gameCreated: (host) =>
      `🧠 *Riddle Battle created by ${host}!*\n\n` +
      `Put your thinking caps on!\n` +
      `Type */join* to enter the battle.\n` +
      `Type */start* when everyone is ready.`,
      
   roundStarted: (round, total) => 
      `🏁 *Round ${round}/${total} starts in a few seconds...*`,

   sendRiddle: (riddleText) =>
      `🧙‍♂️ *Here is your Riddle:*\n\n` +
      `_"${riddleText}"_\n\n` +
      `You have 30 seconds to guess! ⏱️`,

   correctGuess: (player, time, answer, points) =>
      `✅ *Correct!* @${player} answered it in ${(time/1000).toFixed(1)}s!\n\n` +
      `The answer was: *${answer.toUpperCase()}*\n` +
      `+${points} points to you!`,

   wrongGuess: (player) => {
      const taunts = [
         `❌ Nope! @${player}, that's completely wrong. Are you even trying? 😂`,
         `❌ Yikes @${player}... I almost feel bad for you. Try again!`,
         `❌ Bruh. @${player}, that's not even close! 💀`,
         `❌ @${player} - my grandma could guess better than that!`,
         `❌ Incorrect! @${player}, use your brain cells! 🧠`
      ];
      return taunts[Math.floor(Math.random() * taunts.length)];
   },

   timeUp: (answer) =>
      `⌛ *Time is up!*\n\n` +
      `Nobody got it!\n` +
      `The correct answer was: *${answer.toUpperCase()}*`,

   leaderboard: (lbText) =>
      `🏆 *Scores* 🏆\n${lbText}`,

   gameOver: (lbText) =>
      `🏁 *THE BATTLE IS OVER!* 🏁\n\n` +
      `Here is the final leaderboard:\n${lbText}\n\n` +
      `Thanks for playing! Type /game to try something else.`
};
