// ─────────────────────────────────────────────────────────────────────────────
// PAC-MAN for WhatsApp — classic maze, twinkling star dots, message-edit render
// Controls: w(up) a(left) s(down) d(right) — combine like "dds"
// ─────────────────────────────────────────────────────────────────────────────

const ROOMS = new Map();

// ── Twinkling dot frames — two-phase alternating for maximum sparkle ─────────
// Each cell uses (r+c)%2 as phase offset so HALF the board is bright while
// the other half is dim at any moment — perfect checkerboard twinkle
const DOT_FRAMES = ['⭐', '✨'];  // frame 0 = ⭐,  frame 1 = ✨

// ── Emojis ───────────────────────────────────────────────────────────────────
const E = {
  WALL:   '🟦',
  EMPTY:  '⬛',
  POWER:  '🌟',           // power pellet (static, always visible)
  PACMAN: ['😮', '😄', '😮', '😄'], // mouth-open animation per frame
  GHOST:  ['👻', '👾', '💀', '😈'],
  SCARED: '😱',
  EATEN:  '💫',
};

// ── Maze layout — 19 cols × 15 rows ──────────────────────────────────────────
// 0=empty  1=wall  2=dot  3=power pellet
// Walls on BOTH sides, ghost house in centre, symmetric
const BASE_MAP = [
//  0123456789012345678
  '1111111111111111111',  // row  0
  '1222222222222222221',  // row  1  - full dot row
  '1211112112211211121',  // row  2  - inner walls
  '1200002002002000021',  // row  3  - ghost corridor  (ghosts spawn here)
  '1211112112211211121',  // row  4  - inner walls
  '1222222222222222221',  // row  5  - full dot row
  '1111201111111021111',  // row  6  - wall block with tunnels
  '0000200000000020000',  // row  7  - open tunnel row (wrap sides)
  '1111201111111021111',  // row  8  - wall block with tunnels
  '1222222222222222221',  // row  9  - full dot row
  '1211112112211211121',  // row 10  - inner walls
  '1200002002002000021',  // row 11  - pacman start row
  '1211112112211211121',  // row 12  - inner walls
  '1222222222222222221',  // row 13  - full dot row
  '1111111111111111111',  // row 14
];

// Ghost spawn (top-centre corridor, row 3)
const GHOST_SPAWNS = [
  { row: 3, col: 7  },
  { row: 3, col: 9  },
  { row: 3, col: 11 },
  { row: 3, col: 13 },
];

// Pac-Man start (bottom-centre corridor, row 11)
const PACMAN_START = { row: 11, col: 9 };

// ─────────────────────────────────────────────────────────────────────────────
class PacmanRoom {
  constructor(groupId, hostName, client) {
    this.groupId  = groupId;
    this.hostName = hostName;
    this.client   = client;

    this.map        = BASE_MAP.map(row => row.split('').map(Number));
    this.score      = 0;
    this.lives      = 3;
    this.totalDots  = 0;
    this.frame      = 0;        // 0-7, incremented each tick
    this.isGameOver = false;
    this.won        = false;

    this.pacman = { ...PACMAN_START, dir: { dr: 0, dc: 1 } };

    this.ghosts = GHOST_SPAWNS.map((pos, i) => ({
      ...pos,
      emoji:       E.GHOST[i % E.GHOST.length],
      dir:         { dr: 0, dc: 1 },
      scared:      0,
      eatenTimer:  0,
    }));

    // Count dots
    for (const row of this.map)
      for (const cell of row)
        if (cell === 2 || cell === 3) this.totalDots++;

    // Render state
    this.gameMessage        = null;
    this.lastRender         = '';
    this.isRendering        = false;
    this.renderQueued       = false;
    this.messagesSinceBoard = 0;
    this.twinkleTimer       = null;  // fast: 500ms — only re-renders
    this.gameTimer          = null;  // slow: 1500ms — moves ghosts
  }

  // ── Start / Stop ────────────────────────────────────────────────────────────
  async startGame() {
    if (this.twinkleTimer) return;
    await this.render();

    // Fast twinkle — just flips frame and re-renders every 500ms
    this.twinkleTimer = setInterval(() => {
      if (this.isGameOver) return;
      this.frame = (this.frame + 1) % 2;  // flip between 0 and 1
      this.render();
    }, 500);

    // Slow game tick — moves ghosts every 1500ms
    this.gameTimer = setInterval(() => this.tick(), 1500);

    return this.client.sendMessage(this.groupId,
      '🕹️ *PAC-MAN Started!*\n\n' +
      'Controls:\n' +
      '🔼 *w* — Up\n◀️ *a* — Left\n🔽 *s* — Down\n▶️ *d* — Right\n\n' +
      'Combine moves: type *"dds"* to go right twice then down.\n' +
      'Eat all ⭐ dots to win! Avoid 👻 ghosts!\n' +
      'Grab 🌟 power pellets to scare & eat them!'
    );
  }

  stopGame() {
    if (this.twinkleTimer) { clearInterval(this.twinkleTimer); this.twinkleTimer = null; }
    if (this.gameTimer)    { clearInterval(this.gameTimer);    this.gameTimer    = null; }
    this.isGameOver = true;
  }

  // ── Tick (ghost movement only — twinkle is handled separately) ──────────────
  tick() {
    if (this.isGameOver) return;
    // frame is driven by twinkleTimer; tick just moves ghosts
    this.moveGhosts();
    for (const g of this.ghosts) {
      if (g.scared > 0)      g.scared--;
      if (g.eatenTimer > 0)  g.eatenTimer--;
    }
    this.checkCollisions();
    // No render here — twinkleTimer already renders at 500ms
  }

  // ── Input ────────────────────────────────────────────────────────────────────
  async handleMessage(senderName, msg) {
    if (this.isGameOver) return true;
    const body = msg.body.toLowerCase().trim();
    if (body.startsWith('/')) return false;

    const dirMap = {
      w: { dr: -1, dc:  0 },
      a: { dr:  0, dc: -1 },
      s: { dr:  1, dc:  0 },
      d: { dr:  0, dc:  1 },
    };

    let moved = false;
    for (const ch of body) {
      if (!dirMap[ch]) continue;
      this.pacman.dir = dirMap[ch];
      const nr = this.pacman.row + dirMap[ch].dr;
      const nc = this.pacman.col + dirMap[ch].dc;
      if (this.isWalkable(nr, nc)) {
        this.pacman.row = nr;
        this.pacman.col = nc;
        this.eatCell(this.pacman.row, this.pacman.col);
        this.checkCollisions();
        moved = true;
      }
    }

    if (moved) {
      // twinkleTimer will re-render; just mark board dirty
      this.messagesSinceBoard++;
      return true;
    }
    return false;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  isWalkable(r, c) {
    if (r < 0 || r >= this.map.length) return false;
    const row = this.map[r];
    if (!row) return false;
    const cc = ((c % row.length) + row.length) % row.length; // wrap tunnel
    return row[cc] !== 1;
  }

  wrapCoords(r, c, rowLen) {
    const rr = ((r % this.map.length) + this.map.length) % this.map.length;
    const cc = ((c % rowLen) + rowLen) % rowLen;
    return { r: rr, c: cc };
  }

  eatCell(r, c) {
    const cell = this.map[r][c];
    if (cell === 2) {
      this.map[r][c] = 0;
      this.score += 10;
      if (--this.totalDots <= 0) { this.won = true; this.stopGame(); }
    } else if (cell === 3) {
      this.map[r][c] = 0;
      this.score += 50;
      for (const g of this.ghosts) if (!g.eatenTimer) g.scared = 10;
      if (--this.totalDots <= 0) { this.won = true; this.stopGame(); }
    }
  }

  checkCollisions() {
    for (const ghost of this.ghosts) {
      if (ghost.eatenTimer > 0) continue;
      if (ghost.row !== this.pacman.row || ghost.col !== this.pacman.col) continue;
      if (ghost.scared > 0) {
        ghost.scared = 0;
        ghost.eatenTimer = 6;
        const idx = this.ghosts.indexOf(ghost);
        ghost.row = GHOST_SPAWNS[idx].row;
        ghost.col = GHOST_SPAWNS[idx].col;
        this.score += 200;
      } else {
        this.lives--;
        if (this.lives <= 0) { this.stopGame(); return; }
        this.pacman = { ...PACMAN_START, dir: { dr: 0, dc: 1 } };
        GHOST_SPAWNS.forEach((sp, i) => { this.ghosts[i].row = sp.row; this.ghosts[i].col = sp.col; });
      }
    }
  }

  moveGhosts() {
    const DIRS = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    for (const ghost of this.ghosts) {
      if (ghost.eatenTimer > 0) continue;
      const rowLen = this.map[0].length;

      // 70% chance to continue same direction, else pick random valid
      const canContinue = this.isWalkable(ghost.row + ghost.dir.dr, ghost.col + ghost.dir.dc);
      let dirs = canContinue && Math.random() > 0.3
        ? [ghost.dir, ...DIRS.filter(d => d !== ghost.dir).sort(() => Math.random() - 0.5)]
        : [...DIRS].sort(() => Math.random() - 0.5);

      for (const dir of dirs) {
        const { r: nr, c: nc } = this.wrapCoords(ghost.row + dir.dr, ghost.col + dir.dc, rowLen);
        if (this.isWalkable(nr, nc)) {
          ghost.row = nr;
          ghost.col = nc;
          ghost.dir = dir;
          break;
        }
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  getTwinkleDot(r, c) {
    // Checkerboard phase: adjacent cells are always on opposite frames
    // so at any moment half the stars are ⭐ and half are ✨ — pure twinkle
    const phase = (r + c) % 2;
    return DOT_FRAMES[(this.frame + phase) % DOT_FRAMES.length];
  }

  getRenderedBoard() {
    const ROWS = this.map.length;
    const COLS = this.map[0].length;

    // Build display grid with twinkling dots
    const display = this.map.map((row, r) =>
      row.map((cell, c) => {
        if (cell === 1) return E.WALL;
        if (cell === 2) return this.getTwinkleDot(r, c);  // ✨ twinkling!
        if (cell === 3) return E.POWER;
        return E.EMPTY;
      })
    );

    // Draw ghosts
    for (const ghost of this.ghosts) {
      const { row: r, col: c } = ghost;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (ghost.eatenTimer > 0)  display[r][c] = E.EATEN;
      else if (ghost.scared > 0) display[r][c] = E.SCARED;
      else                       display[r][c] = ghost.emoji;
    }

    // Draw Pac-Man (mouth animation)
    display[this.pacman.row][this.pacman.col] = E.PACMAN[this.frame % 4];

    // HUD
    const livesBar = '❤️'.repeat(this.lives) + '🖤'.repeat(Math.max(0, 3 - this.lives));
    let text = `👾 *PAC-MAN* 👾  |  Score: *${this.score}*  |  Lives: ${livesBar}\n\n`;
    for (const row of display) text += row.join('') + '\n';

    if (this.isGameOver) {
      text += this.won
        ? `\n🏆 *YOU WIN!* 🏆\nFinal Score: *${this.score}*\nType */pacman* to play again!`
        : `\n💀 *GAME OVER* 💀\nFinal Score: *${this.score}*\nType */pacman* to play again!`;
    } else {
      text += `\n*w*(↑) *a*(←) *s*(↓) *d*(→)  — combine like "dds"`;
    }
    return text;
  }

  async render() {
    if (this.isRendering) { this.renderQueued = true; return; }
    this.isRendering  = true;
    this.renderQueued = false;
    try {
      const text = this.getRenderedBoard();
      // Always edit — never skip. The stars MUST keep changing visually.
      const shouldResend = this.messagesSinceBoard >= 4;

      if (this.gameMessage && !shouldResend) {
        if (typeof this.gameMessage.edit === 'function') {
          await this.gameMessage.edit(text).catch(() => this._resend(text));
        } else { await this._resend(text); }
      } else { await this._resend(text); }

    } catch (err) { console.error('[PACMAN RENDER]', err); }
    finally {
      this.isRendering = false;
      if (this.renderQueued) this.render();
    }
  }

  async _resend(text) {
    const msg = await this.client.sendMessage(this.groupId, text).catch(() => null);
    if (msg) { this.gameMessage = msg; this.messagesSinceBoard = 0; }
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  createRoom: (groupId, hostName, client) => {
    const room = new PacmanRoom(groupId, hostName, client);
    ROOMS.set(groupId, room);
    return room;
  },
  getRoom:    (groupId) => ROOMS.get(groupId),
  deleteRoom: (groupId) => {
    const room = ROOMS.get(groupId);
    if (room) { room.stopGame(); ROOMS.delete(groupId); }
  },
};
