const responses = require('./botResponses');

class NumberGuessingGame {
    constructor(groupId, hostName, client) {
        this.groupId = groupId;
        this.hostName = hostName;
        this.client = client;

        this.targetNumber = Math.floor(Math.random() * 100) + 1;
        this.totalGuesses = 0;
        this.isActive = true;
    }

    async reply(text, mentions) {
        if (mentions) {
            await this.client.sendMessage(this.groupId, text, { mentions });
        } else {
            await this.client.sendMessage(this.groupId, text);
        }
    }

    async startGame() {
        await this.reply(responses.gameCreated(this.hostName));
    }

    async handleMessage(senderName, msg) {
        if (!this.isActive) return false;

        const body = msg.body.trim();
        const cmd = body.toLowerCase();

        // Try parsing guess
        const guess = parseInt(body, 10);
        if (isNaN(guess)) return false;

        this.totalGuesses++;

        let contact;
        try {
            contact = await msg.getContact();
        } catch (e) {}

        const mentions = contact ? [contact] : [];
        const playerMention = contact ? contact.id._serialized.split('@')[0] : senderName;

        if (guess === this.targetNumber) {
            await this.reply(responses.winner(guess, playerMention, this.totalGuesses), mentions);
            this.cleanup();
            return true;
        } else if (guess > this.targetNumber) {
            await this.reply(responses.tooHigh(guess, playerMention), mentions);
            return true;
        } else if (guess < this.targetNumber) {
            await this.reply(responses.tooLow(guess, playerMention), mentions);
            return true;
        }

        return false;
    }

    cleanup() {
        this.isActive = false;
        // The central router will need to clear `activeGames` for this group
        // If we want the router to know we finished, we might need a callback,
        // but for now, we leave it to the router to check if we are still active.
    }
}

const groupRooms = new Map();

module.exports = {
  getRoom(groupId) {
    return groupRooms.get(groupId) || null;
  },

  createRoom(groupId, hostName, client) {
    const existing = groupRooms.get(groupId);
    if (existing) existing.cleanup();
    const room = new NumberGuessingGame(groupId, hostName, client);
    groupRooms.set(groupId, room);
    return room;
  },

  deleteRoom(groupId) {
    const room = groupRooms.get(groupId);
    if (room) {
      room.cleanup();
      groupRooms.delete(groupId);
    }
  }
};
