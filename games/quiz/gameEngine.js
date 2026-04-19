const responses = require('./botResponses');
const questionsData = require('./questions');

class GameRoom {
  constructor(groupId, hostName, client) {
    this.groupId = groupId;
    this.hostName = hostName;
    this.client = client;

    // Map: displayName -> score
    this.players = new Map();
    this.phase = "lobby"; // lobby | topic_selection | question | intermission
    
    this.questions = [];
    this.totalQuestions = 0;
    this.currentQuestionIndex = 0;
    
    this.currentAnswers = new Map(); // displayName -> guess
    this.topicVotes = new Map();     // displayName -> A, B, C...
    this.topicMapping = {};          // A -> Space, B -> Geography
    
    this.questionStartTime = 0;
    this.timer = null;
  }

  async sendGroup(text) {
    try {
      await this.client.sendMessage(this.groupId, text);
    } catch (err) {
      console.error(`[${this.groupId}] Send to group failed:`, err.message);
    }
  }

  getPlayerByName(name) {
    const lowerName = name.toLowerCase();
    for (const [pName, score] of this.players.entries()) {
      if (pName.toLowerCase() === lowerName) return { name: pName, score };
    }
    return null;
  }

  // --- Lobby ---
  addPlayer(name) {
    if (this.players.has(name)) return false;
    this.players.set(name, 0); // initial score
    return true;
  }

  // --- Game Flow ---
  async startGame() {
    if (this.players.size < 1) return false;
    
    // Setup Topic Mapping
    this.phase = "topic_selection";
    this.topicVotes.clear();
    const availableTopics = Object.keys(questionsData);
    
    let charCode = 65; // 'A'
    for (const topic of availableTopics) {
        this.topicMapping[String.fromCharCode(charCode)] = topic;
        charCode++;
    }

    await this.sendGroup(responses.announceTopics(this.topicMapping));

    // Wait exactly 15 seconds for people to vote
    this.timer = setTimeout(() => {
        this.evaluateTopic();
    }, 15000);
    return true;
  }

  async handleTopicVote(playerName, guessRaw) {
    if (this.phase !== 'topic_selection') return false;
    
    const pData = this.getPlayerByName(playerName);
    if (!pData) return false;
    
    const match = guessRaw.trim().match(/^[A-Z]$/i);
    if (!match) return false;

    const voteKey = match[0].toUpperCase();
    if (!this.topicMapping[voteKey]) return false; // voted for a letter that doesn't map to a topic

    this.topicVotes.set(pData.name, voteKey);

    // If everyone has voted, end early
    if (this.topicVotes.size >= this.players.size) {
       clearTimeout(this.timer);
       await this.evaluateTopic();
    }
    return true;
  }

  async evaluateTopic() {
      this.phase = "intermission";
      
      const counts = {};
      for (const vote of this.topicVotes.values()) {
         counts[vote] = (counts[vote] || 0) + 1;
      }
      
      let winningLetter = null;
      let maxVotes = 0;
      let isTie = false;

      // Find the winner
      for (const [letter, numVotes] of Object.entries(counts)) {
          if (numVotes > maxVotes) {
              maxVotes = numVotes;
              winningLetter = letter;
              isTie = false;
          } else if (numVotes === maxVotes) {
              isTie = true;
          }
      }

      // If nobody voted or tie, pick a random category
      if (!winningLetter || isTie) {
          const keys = Object.keys(this.topicMapping);
          winningLetter = keys[Math.floor(Math.random() * keys.length)];
          isTie = this.topicVotes.size > 0; // only call it a tie if people actually voted
      }

      const winningTopicName = this.topicMapping[winningLetter];
      await this.sendGroup(responses.topicWinner(winningTopicName, isTie));

      // Load questions!
      this.questions = [...questionsData[winningTopicName]];
      this.questions.sort(() => Math.random() - 0.5); // shuffle
      
      this.totalQuestions = 5;
      if (this.questions.length > this.totalQuestions) {
          this.questions = this.questions.slice(0, this.totalQuestions);
      } else {
          this.totalQuestions = this.questions.length;
      }
      
      this.currentQuestionIndex = 0;

      setTimeout(async () => {
          await this.askQuestion();
      }, 3000); // give them 3 seconds to read what topic won before throwing Q1
  }

  async askQuestion() {
    this.currentAnswers.clear();
    this.phase = "question";
    const qData = this.questions[this.currentQuestionIndex];
    
    await this.sendGroup(responses.announceQuestion(qData, this.totalQuestions, this.currentQuestionIndex + 1));
    this.questionStartTime = Date.now();
    
    this.timer = setTimeout(() => {
        this.evaluateRound();
    }, 12000); // 12 seconds instead of 20
  }

  async handleAnswer(playerName, guessRaw) {
    if (this.phase !== 'question') return false;
    
    const pData = this.getPlayerByName(playerName);
    if (!pData) return false;
    
    const match = guessRaw.trim().match(/^[A-D]$/i);
    if (!match) return false;

    const guess = match[0].toUpperCase();

    if (this.currentAnswers.has(pData.name)) return false;

    const timeTaken = Date.now() - this.questionStartTime;
    this.currentAnswers.set(pData.name, { guess, timeTaken });

    if (this.currentAnswers.size >= this.players.size) {
       clearTimeout(this.timer);
       await this.evaluateRound();
    }
    return true;
  }

  async evaluateRound() {
    this.phase = "intermission";
    const qData = this.questions[this.currentQuestionIndex];
    const correctAns = qData.correct;

    const answerStats = [];
    
    for (const [name, data] of this.currentAnswers.entries()) {
        const isCorrect = (data.guess === correctAns);
        let points = 0;
        
        if (isCorrect) {
             const speedBonus = Math.max(0, 10 - Math.floor(data.timeTaken / 2000));
             points = 10 + speedBonus;
             this.players.set(name, this.players.get(name) + points);
        }
        answerStats.push({ name, guess: data.guess, isCorrect, points });
    }

    answerStats.sort((a, b) => b.points - a.points);

    const lbText = responses.formatLeaderboard(this.players);
    await this.sendGroup(responses.questionResults(qData, answerStats, lbText));

    this.currentQuestionIndex++;
    
    if (this.currentQuestionIndex >= this.totalQuestions) {
        setTimeout(async () => {
            const lbSorted = [...this.players.entries()].sort((a,b) => b[1] - a[1]);
            const winner = lbSorted.length > 0 ? lbSorted[0][0] : null;
            await this.sendGroup(responses.finalResults(lbText, winner));
            this.cleanup();
        }, 2000); 
    } else {
        setTimeout(async () => {
            await this.askQuestion();
        }, 2000);
    }
  }

  cleanup() {
    this.phase = 'lobby';
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
  }
};
