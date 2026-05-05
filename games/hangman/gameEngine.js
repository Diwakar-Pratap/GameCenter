const words = require("./words");
const graphics = require("./graphics");

class GameRoom {
  constructor(groupId, hostName, client) {
    this.groupId = groupId;
    this.hostName = hostName;
    this.client = client;

    this.players = []; // Array of { name: string, wid: string }
    this.phase = "lobby"; // "lobby" | "running" | "gameover"
    
    this.word = "";
    this.guessedLetters = new Set();
    this.wrongGuesses = 0;
    this.maxWrongGuesses = 6;
    
    this.boardMessage = null;
    this.currentTaunt = "Let's play Hangman! Give me a letter!";
  }

  async send(text) {
    try {
      return await this.client.sendMessage(this.groupId, text);
    } catch (err) {
      console.error(`[Hangman] Send failed:`, err.message);
      return null;
    }
  }

  async updateBoard() {
    const text = this.renderBoard();
    if (this.boardMessage) {
      try {
        if (typeof this.boardMessage.edit === 'function') {
          await this.boardMessage.edit(text);
          return;
        }
      } catch (err) {
        console.warn(`[Hangman] Edit failed, falling back to resend.`);
      }
      
      try {
        await this.boardMessage.delete(true);
      } catch (err) {}
    }
    this.boardMessage = await this.send(text);
  }

  addPlayer(name, wid) {
    if (this.players.find(p => p.wid === wid)) return false;
    this.players.push({ name, wid });
    return true;
  }

  async startGame() {
    if (this.players.length < 1) {
      await this.send("⚠️ Need at least 1 player to start Hangman!");
      return;
    }
    
    this.word = words[Math.floor(Math.random() * words.length)].toUpperCase();
    this.guessedLetters.clear();
    this.wrongGuesses = 0;
    this.phase = "running";
    this.currentTaunt = "Let's play Hangman! Guess a letter!";
    
    await this.updateBoard();
  }

  getWordDisplay() {
    return this.word
      .split("")
      .map(char => (this.guessedLetters.has(char) ? char : "_"))
      .join(" ");
  }

  getGuessedListDisplay() {
    const sorted = Array.from(this.guessedLetters).sort();
    return sorted.join(", ") || "None yet";
  }

  renderBoard() {
    const graphic = graphics.getFrame(this.wrongGuesses, this.currentTaunt);
    const wordProgress = this.getWordDisplay();
    const guessedList = this.getGuessedListDisplay();
    
    return `${graphic}

📝 *Word:* ${wordProgress}
🔠 *Guessed:* ${guessedList}
❤️ *Lives:* ${this.maxWrongGuesses - this.wrongGuesses} left`;
  }

  isWin() {
    return this.word.split("").every(char => this.guessedLetters.has(char));
  }

  async handleMessage(senderName, msg) {
    if (this.phase !== "running") return false;
    
    const wid = msg.author || msg.from;
    const isPlayer = this.players.find(p => p.wid === wid);
    
    // Ignore non-players quietly
    if (!isPlayer) return false;

    // Check if message is a single letter
    const guess = msg.body.trim().toUpperCase();
    if (!/^[A-Z]$/.test(guess)) return false;

    // Optional: delete their message to keep chat clean
    try {
      if (msg.fromMe) {} 
      // otherwise, group msg delete requires admin
    } catch (e) {}

    if (this.guessedLetters.has(guess)) {
      this.currentTaunt = graphics.getRandomTaunt("alreadyGuessed");
      await this.updateBoard();
      return true; // handled
    }

    this.guessedLetters.add(guess);

    if (this.word.includes(guess)) {
      // Correct guess
      if (this.isWin()) {
        this.phase = "gameover";
        this.currentTaunt = graphics.getRandomTaunt("win");
        await this.updateBoard();
        await this.send(`🎉 *${senderName}* guessed the final letter! You won! The word was *${this.word}*.`);
        return true;
      } else {
        this.currentTaunt = graphics.getRandomTaunt("correct");
        await this.updateBoard();
        return true;
      }
    } else {
      // Wrong guess
      this.wrongGuesses++;
      
      if (this.wrongGuesses >= this.maxWrongGuesses) {
        this.phase = "gameover";
        this.currentTaunt = graphics.getRandomTaunt("lose");
        await this.updateBoard();
        await this.send(`💀 *GAME OVER!* The hangman dropped. The word was *${this.word}*.`);
        return true;
      } else {
        this.currentTaunt = graphics.getRandomTaunt("wrong");
        await this.updateBoard();
        return true;
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
