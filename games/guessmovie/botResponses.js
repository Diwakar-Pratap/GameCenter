module.exports = {
    gameCreated: (hostName) => 
        `🎬 *GUESS THE MOVIE / SONG* 🎬\n\n` + 
        `${hostName} has started the game!\n` +
        `I will give you an Emoji clue, a Dialogue, or some Song lyrics.\n` + 
        `First person to reply with the exact movie name wins the round!\n\n` +
        `Type */start* when everyone is ready.`,
    
    announceClue: (roundNum, totalRounds, qData) => 
        `🎥 *Round ${roundNum}/${totalRounds}* 🎥\n\n` +
        `*[ ${qData.type} ]*\n` +
        `👉 ${qData.clue}\n\n` +
        `*Guess the movie name now!* (15 seconds)`,
        
    correctGuess: (player, timeTaken, correctName, points) => 
        `🎉 *CORRECT!* 🎉\n\n` +
        `@${player} guessed it right in ${(timeTaken / 1000).toFixed(1)} seconds!\n` +
        `The movie was: *${correctName}*\n` +
        `*+${points} points*`,
        
    timeUp: (correctName) => 
        `⏳ *TIME IS UP!* ⏳\n\n` +
        `Nobody guessed it! The correct movie was: *${correctName}*`,
        
    leaderboard: (lbText) => 
        `🏆 *Current Scores* 🏆\n${lbText}`,
        
    finalResults: (lbText, winner) => 
        `🎬 *GAME OVER* 🎬\n\n` +
        `*Final Leaderboard:*\n${lbText}\n\n` +
        (winner ? `🥇 *${winner}* takes the trophy! Congratulations! 🌟` : `No one scored? Better luck next time!`) +
        `\n\nType */game* to play something else!`,
        
    stopped: (hostName) => 
        `🛑 *Game stopped by ${hostName}.*\n\nType /game to play something else!`
};
