module.exports = {
  gameCreated: (hostName) => 
    `🎲 *Number Guessing Game* 🎲\n\n${hostName} has started a new game!\n\nI have picked a random number between *1 and 100*.\n\nType your guess (e.g., 42). First to guess it wins!`,
  
  alreadyRunning: () => 
    `⚠️ A Number Guessing game is already running here! Keep guessing!`,
  
  tooHigh: (guess, player) => 
    `📈 *${guess}* is TOO HIGH, @${player}! Try again.`,
    
  tooLow: (guess, player) => 
    `📉 *${guess}* is TOO LOW, @${player}! Try again.`,
    
  winner: (guess, player, totalGuesses) => 
    `🎉🎉 *WE HAVE A WINNER!* 🎉🎉\n\nCongratulations @${player}! The number was indeed *${guess}*.\n\nIt took ${totalGuesses} total guesses to find the number. Type /game to see what else you can play!`,
    
  stopped: (hostName) => 
    `🛑 *Number Guessing ended by ${hostName}.*\n\nThe number remains a mystery! Type /game to play something else.`
};
