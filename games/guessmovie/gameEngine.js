const responses = require('./botResponses');
const movieData = require('./data');

class GuessMovieGame {
    constructor(groupId, hostName, client) {
        this.groupId = groupId;
        this.hostName = hostName;
        this.client = client;

        this.players = new Map(); // name -> score
        this.phase = "lobby"; // lobby | question | intermission
        
        this.questions = [];
        this.totalQuestions = 5;
        this.currentQuestionIndex = 0;
        
        this.questionStartTime = 0;
        this.timer = null;
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
        if (this.players.size < 1) return false;
        
        // Shuffle and pick 5
        this.questions = [...movieData].sort(() => Math.random() - 0.5).slice(0, this.totalQuestions);
        this.totalQuestions = this.questions.length;
        this.currentQuestionIndex = 0;
        
        await this.reply("🎮 The game is starting! Get ready...");
        setTimeout(() => this.askQuestion(), 3000);
        return true;
    }

    async askQuestion() {
        this.phase = "question";
        const q = this.questions[this.currentQuestionIndex];
        
        await this.reply(responses.announceClue(this.currentQuestionIndex + 1, this.totalQuestions, q));
        this.questionStartTime = Date.now();
        
        this.timer = setTimeout(() => {
            this.evaluateRound(null, null, 0); // No winner
        }, 15000); // 15 seconds to answer
    }

    // Helper to format leaderboard
    getLeaderboardText() {
        const sorted = [...this.players.entries()].sort((a,b) => b[1] - a[1]);
        if (sorted.length === 0) return "No scores yet.";
        return sorted.map((p, i) => `${i+1}. ${p[0]} - ${p[1]} pts`).join('\n');
    }

    async evaluateRound(winnerName, playerMention, timeTaken, mentions = []) {
        this.phase = "intermission";
        if (this.timer) clearTimeout(this.timer);
        
        const q = this.questions[this.currentQuestionIndex];
        
        if (winnerName) {
            // Calculate speed bonus
            const speedBonus = Math.max(0, 10 - Math.floor(timeTaken / 1500));
            const points = 10 + speedBonus;
            
            this.players.set(winnerName, this.players.get(winnerName) + points);
            await this.reply(responses.correctGuess(playerMention, timeTaken, q.correct, points), mentions);
        } else {
            await this.reply(responses.timeUp(q.correct));
        }

        await this.reply(responses.leaderboard(this.getLeaderboardText()));
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex >= this.totalQuestions) {
            setTimeout(async () => {
                const sorted = [...this.players.entries()].sort((a,b) => b[1] - a[1]);
                const overallWinner = sorted.length > 0 && sorted[0][1] > 0 ? sorted[0][0] : null;
                await this.reply(responses.finalResults(this.getLeaderboardText(), overallWinner));
                this.cleanup();
            }, 3000);
        } else {
            setTimeout(() => this.askQuestion(), 4000); // Next round delay
        }
    }

    normalizeName(name) {
        // Strip punctuation, make lowercase, remove extra spaces
        return name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    async handleMessage(senderName, msg) {
        if (this.phase !== 'question') return false;

        const guessClean = this.normalizeName(msg.body);
        if (!guessClean) return false;

        const q = this.questions[this.currentQuestionIndex];
        const validAnswers = [q.correct, ...q.alternates].map(this.normalizeName);

        // Check if exact match exists
        if (validAnswers.includes(guessClean)) {
             const timeTaken = Date.now() - this.questionStartTime;
             
             // Extract contact for mention if possible
             let contact;
             try { contact = await msg.getContact(); } catch(e){}
             let playerMention = senderName;
             if (contact && contact.id && contact.id.user) {
                 playerMention = contact.id.user;
             } else if (contact && contact.number) {
                 playerMention = contact.number;
             }
             const mentions = contact ? [contact] : [];
             
             // Guarantee player is in the map
             if (!this.players.has(senderName)) this.players.set(senderName, 0);

             await this.evaluateRound(senderName, playerMention, timeTaken, mentions);
             return true;
        }
        
        // Might implement a "close guess" warning, but string distance algos are heavy. Let's keep it exact for now.
        return false;
    }

    cleanup() {
        this.phase = "gameover"; // Will cause central router to delete it
        if (this.timer) clearTimeout(this.timer);
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
    const room = new GuessMovieGame(groupId, hostName, client);
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
