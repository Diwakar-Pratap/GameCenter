/**
 * botResponses.js
 * ───────────────
 * Text resources and board rendering for Tic-Tac-Toe
 */

module.exports = {
  lobbyCreated: (hostName) =>
    `❌ *Tic-Tac-Toe Started!* ⭕\n\n${hostName} has created a lobby.\nType */join* to enter as Player 2.\nType */start* when both players are ready.`,

  joinSuccess: (playerName) =>
    `✅ *${playerName}* joined as Player 2! (2/2)\nType */start* to begin.`,

  lobbyFull: () =>
    `⚠️ The lobby is already full (2 players).`,

  onlyHostCanStart: () =>
    `⚠️ Only the host can start the game!`,

  needTwoPlayers: () =>
    `⚠️ Need exactly 2 players to play Tic-Tac-Toe!`,

  gameAlreadyStarted: () =>
    `⚠️ Game has already started!`,

  noGameRunning: () =>
    `⚠️ No Tic-Tac-Toe game is currently running here.`,

  renderBoard: (board, playerX, playerO, currentTurnName, currentSymbol) => {
    // board is an array of length 9, initialized with 1-9 strings or "❌" / "⭕"
    // e.g., ["1", "2", "3", "4", "❌", "6", "7", "8", "⭕"]
    const pad = (cell) => {
        if (cell === "❌") return " ❌";
        if (cell === "⭕") return " ⭕";
        return `  ${cell} `;
    };

    let text = `🎮 *TIC-TAC-TOE* 🎮\n`;
    text += `❌ ${playerX}\n⭕ ${playerO}\n\n`;
    text += `${pad(board[0])} | ${pad(board[1])} | ${pad(board[2])} \n`;
    text += `------+------+------\n`;
    text += `${pad(board[3])} | ${pad(board[4])} | ${pad(board[5])} \n`;
    text += `------+------+------\n`;
    text += `${pad(board[6])} | ${pad(board[7])} | ${pad(board[8])} \n\n`;
    
    text += `👉 *Turn:* ${currentTurnName} (${currentSymbol})\n`;
    text += `Reply with a number (1-9) to play!`;
    return text;
  },

  invalidMove: (name) =>
    `⚠️ *${name}*, that cell is already taken or invalid! Try a number from 1 to 9 that is still open.`,

  notYourTurn: (name) =>
    `⚠️ *${name}*, it is not your turn yet!`,

  notAPlayer: () =>
    `⚠️ You are not playing this game. Please spectate quietly!`,

  win: (winnerName, board) => {
    let text = module.exports.renderBoard(board, "", "", "", "").split("👉 *Turn:*")[0];
    text += `\n🎉 *${winnerName} WINS!* 🎉\nGame Over.`;
    return text;
  },

  draw: (board) => {
    let text = module.exports.renderBoard(board, "", "", "", "").split("👉 *Turn:*")[0];
    text += `\n🤝 *IT'S A DRAW!* 🤝\nGame Over.`;
    return text;
  },

  finalBoard: (board, playerX, playerO) => {
    let text = module.exports.renderBoard(board, playerX, playerO, "", "").split("👉 *Turn:*")[0];
    text += `🏁 *GAME OVER* 🏁`;
    return text;
  },

  winTextOnly: (winnerName) => `🎉 *${winnerName} WINS!* 🎉`
};
