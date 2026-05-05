const TETROMINOES = require('./tetrominoes');

const ROOMS = new Map();

class TetrisRoom {
  constructor(groupId, hostName, client) {
    this.groupId = groupId;
    this.hostName = hostName;
    this.client = client;
    this.board = Array.from({ length: 20 }, () => Array(10).fill(''));
    this.score = 0;
    this.activePiece = null;
    this.intervalTimer = null;
    this.isGameOver = false;
    this.gameMessage = null;
    this.speed = 2500; 
    this.lastRender = "";
    this.messagesSinceLastBoard = 0;
    this.isRendering = false;
    this.renderQueued = false;
  }

  async startGame() {
    if (this.intervalTimer) return;
    this.intervalTimer = "starting";
    this.spawnPiece();
    await this.render();
    this.intervalTimer = setInterval(() => {
      this.tick();
    }, this.speed);
    return this.client.sendMessage(this.groupId, "🚀 *Tetris has started!*");
  }

  stopGame() {
    if (this.intervalTimer && this.intervalTimer !== "starting") clearInterval(this.intervalTimer);
    this.isGameOver = true;
  }

  spawnPiece() {
    const keys = Object.keys(TETROMINOES);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const tet = TETROMINOES[key];
    this.activePiece = {
      shape: tet.shape,
      color: tet.color,
      x: Math.floor((10 - tet.shape[0].length) / 2),
      y: 0
    };
    if (this.checkCollision(this.activePiece.x, this.activePiece.y, this.activePiece.shape)) {
      this.isGameOver = true;
      this.stopGame();
      this.render();
    }
  }

  checkCollision(x, y, shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          let newX = x + c;
          let newY = y + r;
          if (newX < 0 || newX >= 10 || newY >= 20) return true; // walls/floor
          if (newY >= 0 && this.board[newY][newX] !== '') return true; // block collision
        }
      }
    }
    return false;
  }

  lockPiece() {
    for (let r = 0; r < this.activePiece.shape.length; r++) {
      for (let c = 0; c < this.activePiece.shape[r].length; c++) {
        if (this.activePiece.shape[r][c]) {
          let y = this.activePiece.y + r;
          let x = this.activePiece.x + c;
          if (y >= 0 && y < 20) this.board[y][x] = this.activePiece.color;
        }
      }
    }
    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    let linesCleared = 0;
    for (let r = this.board.length - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== '')) {
        this.board.splice(r, 1);
        this.board.unshift(Array(10).fill(''));
        linesCleared++;
        r++; // check same row index again after shifting
      }
    }
    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800];
      this.score += points[linesCleared] || 1000;
      // Increase speed slightly
      this.speed = Math.max(1000, this.speed - (linesCleared * 50));
      if (this.intervalTimer && this.intervalTimer !== "starting") {
        clearInterval(this.intervalTimer);
        this.intervalTimer = setInterval(() => this.tick(), this.speed);
      }
    }
  }

  tick() {
    if (this.isGameOver) return;
    if (!this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activePiece.shape)) {
      this.activePiece.y++;
    } else {
      this.lockPiece();
    }
    this.render();
  }

  rotateMatrix(matrix) {
    const N = matrix.length;
    const result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        result[c][N - 1 - r] = matrix[r][c];
      }
    }
    return result;
  }

  async handleMessage(senderName, msg) {
    if (this.isGameOver) return true;
    if (!this.activePiece) return false;

    // Ignore commands like /stop etc, they are handled in index.js
    if (msg.body.startsWith('/')) return false;

    const body = msg.body.toLowerCase().trim();
    let moved = false;

    for (let char of body) {
      if (char === 'a') {
        if (!this.checkCollision(this.activePiece.x - 1, this.activePiece.y, this.activePiece.shape)) {
          this.activePiece.x--;
          moved = true;
        }
      } else if (char === 'd') {
        if (!this.checkCollision(this.activePiece.x + 1, this.activePiece.y, this.activePiece.shape)) {
          this.activePiece.x++;
          moved = true;
        }
      } else if (char === 's') {
        if (!this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activePiece.shape)) {
          this.activePiece.y++;
          moved = true;
        }
      } else if (char === 'w') {
        const rotated = this.rotateMatrix(this.activePiece.shape);
        if (!this.checkCollision(this.activePiece.x, this.activePiece.y, rotated)) {
          this.activePiece.shape = rotated;
          moved = true;
        }
      } else if (char === 'x') { // hard drop
         while (!this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activePiece.shape)) {
           this.activePiece.y++;
         }
         this.lockPiece();
         moved = true;
         break; // stop processing after hard drop
      }
    }

    if (moved) {
      this.messagesSinceLastBoard++;
      this.render();
      return true; // handled
    }
    return false;
  }

  getRenderedBoard() {
    let display = Array.from({ length: 20 }, () => Array(10).fill('⬜'));
    
    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        if (this.board[r][c] !== '') {
          display[r][c] = this.board[r][c];
        }
      }
    }

    if (this.activePiece && !this.isGameOver) {
      for (let r = 0; r < this.activePiece.shape.length; r++) {
        for (let c = 0; c < this.activePiece.shape[r].length; c++) {
          if (this.activePiece.shape[r][c]) {
            let y = this.activePiece.y + r;
            let x = this.activePiece.x + c;
            if (y >= 0 && y < 20 && x >= 0 && x < 10) {
              display[y][x] = this.activePiece.color;
            }
          }
        }
      }
    }

    let text = `🎮 *TETRIS* 🎮\nHost: ${this.hostName}\nScore: ${this.score}\n\n`;
    for (let r = 0; r < 20; r++) {
      text += display[r].join('') + '\n';
    }

    if (this.isGameOver) {
      text += `\n❌ *GAME OVER* ❌\nFinal Score: ${this.score}\nType /game to play again!`;
    } else {
      text += `\nControls: a(left), d(right), s(down), w(rotate), x(hard drop)\nYou can type multiple (e.g., 'aaw')`;
    }
    return text;
  }

  async render() {
    if (this.isRendering) {
      this.renderQueued = true;
      return;
    }
    this.isRendering = true;
    this.renderQueued = false;

    try {
      const text = this.getRenderedBoard();
      if (text === this.lastRender && this.messagesSinceLastBoard < 4) {
        // do nothing
      } else {
        this.lastRender = text;
        let shouldResend = this.messagesSinceLastBoard >= 4;

        if (this.gameMessage && !shouldResend) {
          if (typeof this.gameMessage.edit === 'function') {
            await this.gameMessage.edit(text).catch(() => { shouldResend = true; });
          } else {
            shouldResend = true;
          }
        }
        
        if (!this.gameMessage || shouldResend) {
          let oldMsg = this.gameMessage;
          this.gameMessage = await this.client.sendMessage(this.groupId, text).catch(()=>null);
          
          if (this.gameMessage) {
            this.messagesSinceLastBoard = 0;
            // No longer deleting old message
          } else {
            this.gameMessage = oldMsg; // restore if failed
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.isRendering = false;
      if (this.renderQueued) {
        this.render();
      }
    }
  }
}

module.exports = {
  createRoom: (groupId, hostName, client) => {
    const room = new TetrisRoom(groupId, hostName, client);
    ROOMS.set(groupId, room);
    return room;
  },
  getRoom: (groupId) => ROOMS.get(groupId),
  deleteRoom: (groupId) => {
    const room = ROOMS.get(groupId);
    if (room) {
      room.stopGame();
      ROOMS.delete(groupId);
    }
  }
};
