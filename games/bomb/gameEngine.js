/**
 * gameEngine.js
 * ─────────────
 * Game state & logic for the Bomb Defusal WhatsApp Group Bot.
 *
 * One GameRoom per WhatsApp group (keyed by groupId).
 * Multiple groups can run simultaneous games.
 *
 * Timer: uses setTimeout. When it fires → detonate() runs,
 * eliminates the holder, and either starts the next round or
 * declares a winner — all via client.sendMessage to the group.
 */

const responses = require("./botResponses");

const BOMB_MIN_SECS = 10;
const BOMB_MAX_SECS = 25;

function randomTimer() {
  return (
    Math.floor(Math.random() * (BOMB_MAX_SECS - BOMB_MIN_SECS + 1)) +
    BOMB_MIN_SECS
  );
}

class GameRoom {
  /**
   * @param {string} groupId   - WhatsApp group ID (e.g. "1234@g.us")
   * @param {string} hostName  - Display name of the host
   * @param {object} client    - whatsapp-web.js Client instance
   */
  constructor(groupId, hostName, client) {
    this.groupId = groupId;
    this.hostName = hostName;
    this.client = client;

    // Map: displayName → contactId (e.g. "Rahul" → "919876543210@c.us")
    this.players = new Map();
    this.eliminated = new Set();
    this.bombHolder = null;
    this.phase = "lobby"; // "lobby" | "running" | "idle"
    this._timer = null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get activePlayers() {
    return [...this.players.keys()].filter((n) => !this.eliminated.has(n));
  }

  get activePlayerNames() {
    return this.activePlayers;
  }

  async send(text) {
    try {
      await this.client.sendMessage(this.groupId, text);
    } catch (err) {
      console.error(`[${this.groupId}] Send failed:`, err.message);
    }
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────

  addPlayer(name, contactId) {
    if (this.players.has(name)) return false;
    this.players.set(name, contactId);
    return true;
  }

  // ── Timer ─────────────────────────────────────────────────────────────────

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _startTimer(seconds) {
    this._clearTimer();
    this._timer = setTimeout(() => this._detonate(), seconds * 1000);
  }

  async _detonate() {
    if (this.phase !== "running" || !this.bombHolder) return;

    const victim = this.bombHolder;
    this.eliminated.add(victim);
    console.log(`[BOOM] ${victim} eliminated in group ${this.groupId}`);

    await this.send(responses.explosion(victim));

    const survivors = this.activePlayers;

    if (survivors.length === 0) {
      this.phase = "idle";
      await this.send(responses.draw());
    } else if (survivors.length === 1) {
      this.phase = "idle";
      await this.send(responses.winner(survivors[0]));
    } else {
      // Start next round
      const newHolder =
        survivors[Math.floor(Math.random() * survivors.length)];
      this.bombHolder = newHolder;
      const seconds = randomTimer();
      await this.send(responses.nextRound(newHolder, seconds, survivors));
      this._startTimer(seconds);
    }
  }

  // ── Round ─────────────────────────────────────────────────────────────────

  begin() {
    this.phase = "running";
    const active = this.activePlayers;
    const holder = active[Math.floor(Math.random() * active.length)];
    this.bombHolder = holder;
    const seconds = randomTimer();
    this._startTimer(seconds);
    return { holder, seconds };
  }

  /**
   * Pass the bomb from `fromName` to `toName`.
   * @returns {{ ok: boolean, error?: string, seconds?: number }}
   */
  passBomb(fromName, toName) {
    if (this.phase !== "running") {
      return { ok: false, error: responses.noGameRunning() };
    }
    if (fromName !== this.bombHolder) {
      return { ok: false, error: responses.notYourBomb(this.bombHolder) };
    }
    if (fromName === toName) {
      return { ok: false, error: responses.passToSelf() };
    }
    if (!this.activePlayers.includes(toName)) {
      return { ok: false, error: responses.invalidTarget(toName) };
    }

    this._clearTimer();
    this.bombHolder = toName;
    const seconds = randomTimer();
    this._startTimer(seconds);
    return { ok: true, seconds };
  }

  cleanup() {
    this._clearTimer();
    this.phase = "idle";
  }
}

// ── Room Registry ─────────────────────────────────────────────────────────────

const rooms = new Map(); // groupId → GameRoom

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
  },

  allRooms() {
    return rooms;
  },
};
