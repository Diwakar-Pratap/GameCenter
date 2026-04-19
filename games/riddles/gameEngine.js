const riddleData = require('./data');
const responses = require('./botResponses');

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class RiddleGame {
    constructor(groupId, hostName, client) {
        this.groupId = groupId;
        this.hostName = hostName;
        this.client = client;
        
        this.players = new Map();
        this.phase = "lobby"; 
        
        this.questions = shuffleArray(riddleData).slice(0, 5); // 5 riddles per game
        this.currentQuestionIndex = 0;
        this.timer = null;
        this.roundStartTime = null;
        this.isActive = true;
        this.lastTauntTime = 0;
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

    getLeaderboardText() {
        const sorted = [...this.players.entries()].sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return "No scores yet.";
        return sorted.map((p, i) => `${i+1}. ${p[0]} - ${p[1]} pts`).join('\n');
    }

    async startGame() {
        if (this.players.size < 1) return false;
        
        this.phase = "intermission";
        await this.startRound();
        return true;
    }

    async startRound() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.phase = "gameover";
            await this.reply(responses.gameOver(this.getLeaderboardText()));
            this.cleanup();
            return;
        }

        const q = this.questions[this.currentQuestionIndex];
        
        await this.reply(responses.roundStarted(this.currentQuestionIndex + 1, this.questions.length));
        
        setTimeout(async () => {
             this.phase = "question";
             this.roundStartTime = Date.now();
             await this.reply(responses.sendRiddle(q.question));
             
             this.timer = setTimeout(async () => {
                 await this.evaluateRound(null, null, 0);
                 await this.scheduleNextRound();
             }, 30000); // 30 seconds to answer
             
        }, 2000);
    }
    
    async scheduleNextRound() {
        setTimeout(async () => {
            await this.reply(responses.leaderboard(this.getLeaderboardText()));
            this.currentQuestionIndex++;
            setTimeout(async () => {
                 await this.startRound();
            }, 3000);
        }, 1000);
    }

    async evaluateRound(winnerName, playerMention, timeTaken, mentions = []) {
        this.phase = "intermission";
        if (this.timer) clearTimeout(this.timer);
        
        const q = this.questions[this.currentQuestionIndex];
        const displayAnswer = q.answers[0]; // just show first accepted format
        
        if (winnerName) {
            // Calculate speed bonus. Max 10 pts base + 10 speed bonus.
            const speedBonus = Math.max(0, 10 - Math.floor(timeTaken / 3000));
            const points = 10 + speedBonus;
            
            this.players.set(winnerName, this.players.get(winnerName) + points);
            await this.reply(responses.correctGuess(playerMention, timeTaken, displayAnswer, points), mentions);
        } else {
            await this.reply(responses.timeUp(displayAnswer));
        }
    }

    cleanGuess(text) {
        return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    }

    async handleMessage(senderName, msg) {
         if (this.phase !== "question") return false;
         
         const guess = this.cleanGuess(msg.body);
         if (!guess) return false;

         const currentQ = this.questions[this.currentQuestionIndex];
         
         let isCorrect = false;
         for (let ans of currentQ.answers) {
             // Accept exact match or if the accepted answer is inside their body of text.
             // e.g., if answer is "candle" and they say "its a candle", it will match if ans is "candle".
             if (guess === this.cleanGuess(ans) || guess.includes(this.cleanGuess(ans))) {
                 isCorrect = true;
                 break;
             }
         }
         
         if (isCorrect) {
             const timeTaken = Date.now() - this.roundStartTime;
             
             let contact;
             try { contact = await msg.getContact(); } catch(e){}
             
             let playerMention = senderName;
             if (contact && contact.id && contact.id.user) {
                 playerMention = contact.id.user;
             } else if (contact && contact.number) {
                 playerMention = contact.number;
             }
             const mentions = contact ? [contact] : [];
             
             if (!this.players.has(senderName)) this.players.set(senderName, 0);

             await this.evaluateRound(senderName, playerMention, timeTaken, mentions);
             await this.scheduleNextRound();
             return true;
         } else {
             // To prevent overwhelming spam if everyone screams random words,
             // only taunt if the player has explicitly joined the game AND
             // add a 5-second cooldown between consecutive taunts.
             if (this.players.has(senderName)) {
                 const now = Date.now();
                 if (now - this.lastTauntTime > 5000) {
                     this.lastTauntTime = now;
                     let contact;
                     try { contact = await msg.getContact(); } catch(e){}
                     let playerMention = senderName;
                     if (contact && contact.id && contact.id.user) {
                         playerMention = contact.id.user;
                     } else if (contact && contact.number) {
                         playerMention = contact.number;
                     }
                     const mentions = contact ? [contact] : [];
                     await this.reply(responses.wrongGuess(playerMention), mentions);
                 }
             }
             return true;
         }
    }

    cleanup() {
        this.isActive = false;
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
    const room = new RiddleGame(groupId, hostName, client);
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
