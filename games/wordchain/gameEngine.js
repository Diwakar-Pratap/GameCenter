const responses = require('./botResponses');
const moviesList = require('./movies');

class WordChainGame {
    constructor(groupId, hostName, client) {
        this.groupId = groupId;
        this.hostName = hostName;
        this.client = client;

        this.players = new Map(); // name -> score
        this.usedWords = new Set();
        this.currentLetter = "";
        this.isActive = false;
        this.inactivityTimer = null;
        this.startNewRound();
    }

    startNewRound() {
        const starters = ["apple", "elephant", "tiger", "mountain", "river", "cinema", "music"];
        this.currentWord = starters[Math.floor(Math.random() * starters.length)];
        this.currentLetter = this.currentWord.slice(-1).toLowerCase();
        this.usedWords.clear();
    }

    async reply(text, mentions = []) {
        try {
            await this.client.sendMessage(this.groupId, text, { mentions });
        } catch (e) {
            console.error(e);
        }
    }

    addPlayer(name) {
        if (!this.players.has(name)) {
            this.players.set(name, 0);
            return true;
        }
        return false;
    }

    async startGame() {
        this.isActive = true;
        this.startNewRound();
        this.usedWords.add(this.currentWord);
        await this.reply(responses.gameCreated(this.hostName));
        setTimeout(async () => {
            await this.reply(responses.started(this.currentWord, this.currentLetter));
            this.startRoundTimer();
        }, 1500);
        return true;
    }

    startRoundTimer() {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(async () => {
            if (!this.isActive) return;
            this.isActive = false;
            await this.reply(responses.timeUp(this.getLeaderboardText()));
        }, 60000); // 60 seconds strict round
    }

    getLeaderboardText() {
        const sorted = [...this.players.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return "No scores yet.";
        return sorted.map((p, i) => `${i+1}. ${p[0]} - ${p[1]} pts`).join('\n');
    }

    cleanInput(text) {
        return text.trim().toLowerCase().replace(/[^\w\s]/g, ''); // keep letters, numbers, spaces
    }

    async handleMessage(senderName, msg) {
        if (!this.isActive) return false;

        const body = this.cleanInput(msg.body);
        if (!body) return false;

        // Skip if single letter or just garbage (like command)
        if (body.length < 2 || msg.body.startsWith('/')) return false;

        const firstChar = body.charAt(0);
        let contact;
        try { contact = await msg.getContact(); } catch(e){}
        let playerMention = senderName;
        if (contact && contact.id && contact.id.user) {
            playerMention = contact.id.user;
        } else if (contact && contact.number) {
            playerMention = contact.number;
        }
        const mentions = contact ? [contact] : [];

        // Rule 1: Must start with the correct letter
        if (firstChar !== this.currentLetter) {
            // Only warn if they clearly tried to play but failed... 
            // In a chat, they might just be talking naturally. So we only trigger if it's a short message or has no spaces.
            if (body.split(' ').length <= 2) {
                 await this.reply(responses.rejectedWrongLetter(playerMention, body, this.currentLetter), mentions);
                 return true;
            }
            return false;
        }

        // Rule 2: Must not be repeating
        if (this.usedWords.has(body)) {
            await this.reply(responses.rejectedRepeat(playerMention, body), mentions);
            return true;
        }

        // Rule 3: Must be a real word OR Indian movie.
        let isRealWord = false;
        let definition = "";
        let isMovie = false;

        // Check dictionary API if it's a single word (dictionary API doesn't handle spaces)
        if (!body.includes(' ')) {
            try {
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(body)}`);
                if (res.ok) {
                    const data = await res.json();
                    isRealWord = true;
                    // Get first short definition
                    definition = data[0]?.meanings[0]?.definitions[0]?.definition || "A valid dictionary word.";
                }
            } catch (err) {
                console.error("Dictionary API Error:", err.message);
                // Fail open gracefully: if API crashes, assume they tell the truth for single simple words, but we just fail to get meaning
            }
        }

        // Check Movie Seed
        if (!isRealWord && moviesList.includes(body)) {
            isMovie = true;
        }

        // Verdict
        if (!isRealWord && !isMovie) {
            await this.reply(responses.rejectedFakeWord(playerMention, body), mentions);
            return true;
        }

        // Success!
        this.usedWords.add(body);
        this.currentWord = body;
        this.currentLetter = body.slice(-1).toLowerCase();

        // Prevent weird non-alphabetic endings from blocking the game
        if (!/^[a-z]$/.test(this.currentLetter)) {
             // Fallback if movie ends in number or special char
             this.currentLetter = 'a';
        }

        // Give points
        if (!this.players.has(senderName)) this.players.set(senderName, 0);
        
        let pts = body.length; // points based on word length!
        this.players.set(senderName, this.players.get(senderName) + pts);

        if (isMovie) {
            await this.reply(responses.acceptedMovie(playerMention, body, this.currentLetter, pts), mentions);
        } else {
            await this.reply(responses.acceptedWord(playerMention, body, definition, this.currentLetter, pts), mentions);
        }

        return true;
    }

    cleanup() {
        this.isActive = false;
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
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
    const room = new WordChainGame(groupId, hostName, client);
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
