const responses = require("./botResponses");

class GameRoom {
  constructor(groupId, hostName, client) {
    this.groupId = groupId;
    this.hostName = hostName;
    this.client = client;

    this.players = []; // Array of { name: string, wid: string, symbol: "❌" | "⭕" }
    this.phase = "lobby"; // "lobby" | "running" | "gameover"
    this.board = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    this.turnIndex = 0; // 0 for player X, 1 for player O
    this.boardMessage = null; // Store the Message object to edit
  }

  async send(text) {
    try {
      return await this.client.sendMessage(this.groupId, text);
    } catch (err) {
      console.error(`[TicTacToe] Send failed:`, err.message);
      return null;
    }
  }

  async updateBoard(text) {
    if (this.boardMessage) {
      try {
        if (typeof this.boardMessage.edit === 'function') {
          await this.boardMessage.edit(text);
          return;
        }
      } catch (err) {
        console.warn(`[TicTacToe] Edit failed, falling back to resend.`);
      }
      
      try {
        await this.boardMessage.delete(true); // true = delete for everyone
      } catch (err) {} // ignore delete errors if message is too old
    }
    this.boardMessage = await this.send(text);
  }

  addPlayer(name, wid) {
    if (this.players.find(p => p.wid === wid)) return false;
    if (this.players.length >= 2) return false;
    
    const symbol = this.players.length === 0 ? "❌" : "⭕";
    this.players.push({ name, wid, symbol });
    return true;
  }

  async startGame() {
    if (this.players.length !== 2) {
      await this.send(responses.needTwoPlayers());
      return;
    }
    this.phase = "running";
    this.turnIndex = 0; // X starts first
    await this.refreshBoard();
  }

  async refreshBoard() {
    const playerX = this.players[0].name;
    const playerO = this.players[1].name;
    const current = this.players[this.turnIndex];
    
    const text = responses.renderBoard(this.board, playerX, playerO, current.name, current.symbol);
    await this.updateBoard(text);
  }

  checkWin() {
    const b = this.board;
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diags
    ];
    for (let line of lines) {
      if (b[line[0]] === b[line[1]] && b[line[1]] === b[line[2]]) {
        return b[line[0]]; // returns "❌" or "⭕"
      }
    }
    return null;
  }

  checkDraw() {
    return this.board.every(cell => cell === "❌" || cell === "⭕");
  }

  async handleMessage(senderName, msg) {
    if (this.phase !== "running") return false;
    
    const wid = msg.author || msg.from;
    const player = this.players.find(p => p.wid === wid);
    
    // Ignore non-players quietly
    if (!player) return false;

    // Check if the message is a valid move (1-9)
    const move = parseInt(msg.body.trim());
    if (isNaN(move) || move < 1 || move > 9) return false;

    // It's a move from a player, delete their message to keep chat clean if possible
    try {
      if (msg.fromMe) {
          // Can't delete incoming messages from group members easily unless admin, 
          // but we can try if we are admin. 
      }
    } catch(e){}

    const currentPlayer = this.players[this.turnIndex];
    
    if (player.wid !== currentPlayer.wid) {
      const warnMsg = await msg.reply(responses.notYourTurn(player.name));
      setTimeout(() => warnMsg.delete(true).catch(()=>{}), 3000);
      return true;
    }

    const index = move - 1;
    if (this.board[index] === "❌" || this.board[index] === "⭕") {
      const warnMsg = await msg.reply(responses.invalidMove(player.name));
      setTimeout(() => warnMsg.delete(true).catch(()=>{}), 3000);
      return true;
    }

    // Apply move
    this.board[index] = player.symbol;
    
    // Check win/draw
    const winnerSymbol = this.checkWin();
    if (winnerSymbol) {
      this.phase = "gameover";
      
      const finalBoardText = responses.finalBoard(this.board, this.players[0].name, this.players[1].name);
      await this.updateBoard(finalBoardText);
      
      const winText = responses.winTextOnly(player.name);
      const winMsg = await this.send(winText);
      if (winMsg) {
          await this.animateFireworks(winMsg, player.name);
      }
      return true;
    }

    if (this.checkDraw()) {
      this.phase = "gameover";
      const finalBoardText = responses.finalBoard(this.board, this.players[0].name, this.players[1].name);
      await this.updateBoard(finalBoardText);
      
      const drawText = `🤝 *IT'S A DRAW!* 🤝`;
      await this.send(drawText);
      return true;
    }

    // Next turn
    this.turnIndex = this.turnIndex === 0 ? 1 : 0;
    await this.refreshBoard();
    
    return true;
  }

  async animateFireworks(msg, winnerName) {
    const frames = [
      `🎉 *${winnerName} WINS!* 🎉\n🎇      🎆`,
      `🎉 *${winnerName} WINS!* 🎉\n  🎇  🎆  `,
      `🎉 *${winnerName} WINS!* 🎉\n    🎆    `,
      `🎉 *${winnerName} WINS!* 🎉\n🎇      🎆`,
      `🎉 *${winnerName} WINS!* 🎉\n🎆 🎇 🎆 🎇`
    ];

    for (let i = 0; i < frames.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        if (typeof msg.edit === 'function') {
           await msg.edit(frames[i]);
        } else {
           break;
        }
      } catch (err) {
        break;
      }
    }
  }

  cleanup() {
    this.phase = "gameover";
  }
}

const rooms = new Map();

module.exports = {
  getRoom(groupId) {
    return rooms.get(groupId) || null;
  },
  createRoom(groupId, hostName, client) {
    const existing = rooms.get(groupId);
    if (existing) existing.cleanup();
    const room = new GameRoom(groupId, hostName, client);
    rooms.set(groupId, room);
    return room;
  },
  deleteRoom(groupId) {
    const room = rooms.get(groupId);
    if (room) {
      room.cleanup();
      rooms.delete(groupId);
    }
  }
};
