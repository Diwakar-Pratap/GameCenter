const responses = require('./botResponses');
const leaderboard = require('./leaderboard');

class GameRoom {
  constructor(groupId, hostName, client) {
    this.groupId = groupId;
    this.hostName = hostName;
    this.client = client;

    // Map: displayName -> { id: contactId, role: 'mafia' | 'villager', alive: true }
    this.players = new Map();
    this.phase = "lobby"; // lobby | night | day
    this.mafiaPlayerName = null;
    this.votes = new Map(); // voterName -> targetName
  }

  // --- Helpers ---
  get alivePlayers() {
    return [...this.players.entries()]
      .filter(([name, data]) => data.alive)
      .map(([name]) => name);
  }

  get eliminatedPlayers() {
    return [...this.players.entries()]
      .filter(([name, data]) => !data.alive)
      .map(([name]) => name);
  }

  getPlayerByName(name) {
    // case insensitive match
    const lowerName = name.toLowerCase();
    for (const [pName, data] of this.players.entries()) {
      if (pName.toLowerCase() === lowerName) return { name: pName, ...data };
    }
    return null;
  }

  async sendGroup(text) {
    try {
      await this.client.sendMessage(this.groupId, text);
    } catch (err) {
      console.error(`[${this.groupId}] Send to group failed:`, err.message);
    }
  }

  async sendDM(contactId, text) {
    try {
      await this.client.sendMessage(contactId, text);
    } catch (err) {
      console.error(`[${contactId}] Send DM failed:`, err.message);
    }
  }

  // --- Lobby ---
  addPlayer(name, contactId) {
    if (this.players.has(name)) return false;
    this.players.set(name, { id: contactId, role: null, alive: true });
    return true;
  }

  // --- Game Flow ---
  async startGame() {
    if (this.players.size < 3) return false;

    // Assign roles randomly
    const names = [...this.players.keys()];
    const mafiaIndex = Math.floor(Math.random() * names.length);
    this.mafiaPlayerName = names[mafiaIndex];

    for (let i = 0; i < names.length; i++) {
      const pName = names[i];
      const pData = this.players.get(pName);
      pData.role = (i === mafiaIndex) ? 'mafia' : 'villager';
      this.players.set(pName, pData);
    }

    await this.sendGroup(responses.rolesAssigned());

    // Send DMs
    for (const [pName, pData] of this.players.entries()) {
      if (pData.role === 'mafia') {
        const aliveOthers = this.alivePlayers.filter(n => n !== pName);
        const listText = aliveOthers.map((n, idx) => `${idx + 1}. ${n}`).join('\n');
        await this.sendDM(pData.id, responses.dmRoleMafia(listText));
      } else {
        await this.sendDM(pData.id, responses.dmRoleVillager());
      }
    }

    this.startNightPhase();
    return true;
  }

  startNightPhase() {
    this.phase = "night";
    this.votes.clear();
  }

  // The mafia sends a number based on the alive list (excluding themselves) via DM
  async handleMafiaKill(contactId, targetIndexNum) {
    if (this.phase !== 'night') {
      await this.sendDM(contactId, responses.dmNotNight());
      return { msg: "Not night phase" };
    }

    // Verify doing the kill is the mafia
    const mafiaData = this.players.get(this.mafiaPlayerName);
    if (!mafiaData || mafiaData.id !== contactId) {
       await this.sendDM(contactId, responses.dmNotMafia());
       return { msg: "You aren't mafia" };
    }

    const aliveOthers = this.alivePlayers.filter(n => n !== this.mafiaPlayerName);
    const targetIdx = targetIndexNum - 1; // 0-based
    
    if (targetIdx < 0 || targetIdx >= aliveOthers.length) {
      await this.sendDM(contactId, responses.dmInvalidTarget());
      return { msg: "Invalid target" };
    }

    const victimName = aliveOthers[targetIdx];
    this.players.get(victimName).alive = false;

    await this.sendDM(contactId, responses.dmWaitDay());
    await this.startDayPhase(victimName);
    return { ok: true };
  }

  async startDayPhase(victimName) {
    this.phase = "day";
    // Check win condition right after night death
    if (await this.checkWinCondition()) return;

    if (victimName) {
      await this.sendGroup(responses.dayBeginsWithDeath(victimName));
    } else {
      await this.sendGroup(responses.dayBeginsNoDeath());
    }
  }

  async castVote(voterName, targetNameRaw) {
    if (this.phase !== 'day') return { ok: false, error: responses.voteNotDayPhase() };
    
    const voter = this.getPlayerByName(voterName);
    if (!voter || !voter.alive) return { ok: false, error: "You cannot vote." };

    const target = this.getPlayerByName(targetNameRaw);
    if (!target || !target.alive) {
      return { ok: false, error: responses.voteInvalid(targetNameRaw) };
    }

    if (voter.name.toLowerCase() === target.name.toLowerCase()) {
      return { ok: false, error: responses.voteSelf() };
    }

    this.votes.set(voter.name, target.name);
    
    const aliveCount = this.alivePlayers.length;
    await this.sendGroup(responses.voteCast(voter.name, target.name, this.votes.size));

    // If everyone has voted
    if (this.votes.size >= aliveCount) {
      await this.tallyVotes();
    }
    
    return { ok: true };
  }

  async tallyVotes() {
    const counts = {};
    for (const target of this.votes.values()) {
      counts[target] = (counts[target] || 0) + 1;
    }

    let maxVotes = 0;
    let chosen = null;
    let isTie = false;

    for (const [target, numVotes] of Object.entries(counts)) {
      if (numVotes > maxVotes) {
        maxVotes = numVotes;
        chosen = target;
        isTie = false;
      } else if (numVotes === maxVotes) {
        isTie = true;
      }
    }

    if (isTie) {
      await this.sendGroup(responses.voteTie());
    } else {
      await this.sendGroup(responses.voteEliminated(chosen));
      this.players.get(chosen).alive = false;
    }

    if (await this.checkWinCondition()) return;
    
    // Start next night phase
    await this.sendGroup(`🌙 Back to the Night Phase... DMs will be sent.`);
    
    const mafiaData = this.players.get(this.mafiaPlayerName);
    if (mafiaData && mafiaData.alive) {
        const aliveOthers = this.alivePlayers.filter(n => n !== this.mafiaPlayerName);
        const listText = aliveOthers.map((n, idx) => `${idx + 1}. ${n}`).join('\n');
        await this.sendDM(mafiaData.id, responses.dmRoleMafia(listText));
    }
    
    this.startNightPhase();
  }

  async checkWinCondition() {
    const active = this.alivePlayers;
    const mafiaAlive = active.includes(this.mafiaPlayerName);
    
    if (!mafiaAlive) {
      this.phase = "lobby";
      leaderboard.addWin('Villagers');
      await this.sendGroup(responses.villagerWin());
      return true;
    }
    
    if (mafiaAlive && active.length <= 2) {
      this.phase = "lobby";
      leaderboard.addWin('Mafia');
      await this.sendGroup(responses.mafiaWin([this.mafiaPlayerName]));
      return true;
    }
    
    return false;
  }

  cleanup() {
    this.phase = 'lobby';
    this.votes.clear();
  }
}

// ── Room Registry ─────────────────────────────────────────────────────────────
const groupRooms = new Map(); // groupId -> GameRoom
const playerToGroup = new Map(); // contactId -> groupId (simplifies DM routing)

module.exports = {
  getRoom(groupId) {
    return groupRooms.get(groupId) || null;
  },

  createRoom(groupId, hostName, client) {
    const existing = groupRooms.get(groupId);
    if (existing) existing.cleanup();
    const room = new GameRoom(groupId, hostName, client);
    groupRooms.set(groupId, room);
    return room;
  },

  deleteRoom(groupId) {
    const room = groupRooms.get(groupId);
    if (room) {
      room.cleanup();
      groupRooms.delete(groupId);
    }
  },

  registerDM(contactId, groupId) {
    playerToGroup.set(contactId, groupId);
  },

  getRoomByPlayerId(contactId) {
    const groupId = playerToGroup.get(contactId);
    if (!groupId) return null;
    return groupRooms.get(groupId) || null;
  }
};
