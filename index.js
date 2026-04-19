const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const path = require("path");
const { exec } = require("child_process");

// Engines
const quizEngine = require("./games/quiz/gameEngine");
const mafiaEngine = require("./games/mafia/gameEngine");
const bombEngine = require("./games/bomb/gameEngine");
const numberGuessingEngine = require("./games/numberguessing/gameEngine");
const guessMovieEngine = require("./games/guessmovie/gameEngine");
const wordChainEngine = require("./games/wordchain/gameEngine");
const riddleEngine = require("./games/riddles/gameEngine");

const activeGames = new Map(); // groupId -> 'quiz' | 'mafia' | 'bomb' | 'numberguessing' | 'guessmovie' | 'wordchain' | 'riddle'

// ── Client Setup ──────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
});

client.on("qr", async (qr) => {
  const qrPath = path.join(__dirname, "whatsapp-qr.png");
  await qrcode.toFile(qrPath, qr, {
    type: "png",
    width: 512,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  console.log("\n✅ QR code saved as image!");
  console.log("📂 File: " + qrPath);
  console.log("📱 Opening it now — scan with WhatsApp → Linked Devices\n");
  exec(`start "" "${qrPath}"`);
});

client.on("authenticated", () => {
  console.log("✅ Authenticated! Session saved — no QR needed next time.");
});

client.on("ready", () => {
  console.log("🚀 Unified Game Center is LIVE!");
  console.log("Add this WhatsApp number to a group and type /game to see options!\n");
});

client.on("disconnected", (reason) => {
  console.warn("⚠️ Bot disconnected:", reason);
});

// ── Utility ───────────────────────────────────────────────────────────────────
async function getSenderName(msg) {
  if (msg.fromMe) {
    try {
      const me = await client.getContactById(client.info.wid._serialized);
      return me.pushname || me.name || "Host";
    } catch {
      return "Host";
    }
  }
  try {
    const contact = await msg.getContact();
    return contact.pushname || contact.name || contact.number || "Unknown";
  } catch {
    return "Unknown";
  }
}

// ── Message Router ────────────────────────────────────────────────────────────
client.on("message_create", async (msg) => {
  const isStatus = msg.from === "status@broadcast";
  if (isStatus) return;

  const body = msg.body.trim();
  const cmd = body.toLowerCase();
  
  // DMs might just be for Mafia night actions
  const isDM = !msg.from.includes("@g.us") && !msg.to.includes("@g.us");
  
  // In DMs, map Mafia actions to the engine
  if (isDM && cmd.startsWith("/")) {
      if (typeof mafiaEngine.handlePrivateMessage === "function") {
         const handled = await mafiaEngine.handlePrivateMessage(msg, client);
         if (handled) return;
      }
      // Usually, DMs are only for mafia, otherwise skip
  }

  const groupId = msg.fromMe ? msg.to : msg.from;
  const senderName = await getSenderName(msg);
  const reply = (text) => client.sendMessage(groupId, text);

  // Cross-game cleanup utility if engine handles its own natural end
  const activeGame = activeGames.get(groupId);

  // 1. GAME MENU (/game)
  if (cmd === "/game" || cmd === "/game center" || cmd === "/games") {
    const targetGame = activeGames.get(groupId);
    if (targetGame) {
      return reply(`⚠️ A *${targetGame}* game is currently running. Use */stop* to end it first.`);
    }
    
    const menu = `🎮 *WELCOME TO GAME CENTER* 🎮\n\n` +
      `Here are the games you can play:\n\n` +
      `1️⃣ */quiz* - Play a multiplayer trivia quiz!\n` +
      `2️⃣ */mafia* - Find the hidden mafia members.\n` +
      `3️⃣ */bomb* - Hot potato bomb defusal!\n` +
      `4️⃣ */numberguessing* - Higher/lower number game.\n` +
      `5️⃣ */guessmovie* - Guess the Indian Movie from Emojis, Dialogues, or Songs!\n` +
      `6️⃣ */wordchain* - Antakshari with English Words & Movie Names!\n` +
      `7️⃣ */riddle* - Riddle Battle! First to guess correctly wins.\n\n` +
      `Type the command of the game you want to start!`;
      
    return reply(menu);
  }

  // 2. DISPATCH COMMANDS TO START GAMES
  if (cmd === "/quiz") {
     if (activeGames.has(groupId) && activeGames.get(groupId) !== 'quiz') return reply(`⚠️ Another game (${activeGames.get(groupId)}) is running. Stop it first.`);
     const room = quizEngine.getRoom(groupId);
     if (room && room.phase !== "lobby") return reply(`⚠️ A quiz is already running!`);
     activeGames.set(groupId, 'quiz');
     const newRoom = quizEngine.createRoom(groupId, senderName, client);
     newRoom.addPlayer(senderName);
     return reply(`🧠 *Quiz Game Started!*\n\n${senderName} has created a lobby.\nType */join* to enter.\nType */start* when everyone is ready.`);
  }
  
  if (cmd === "/mafia") {
     if (activeGames.has(groupId) && activeGames.get(groupId) !== 'mafia') return reply(`⚠️ Another game (${activeGames.get(groupId)}) is running. Stop it first.`);
     const room = mafiaEngine.getRoom(groupId);
     if (room && room.phase !== "lobby") return reply(`⚠️ A mafia game is already running!`);
     activeGames.set(groupId, 'mafia');
     const newRoom = mafiaEngine.createRoom(groupId, senderName, client);
     newRoom.addPlayer(senderName, msg.author || msg.from);
     return reply(`🕴️ *Mafia Game Started!*\n\n${senderName} has created a lobby.\nType */join* to enter.\nType */start* when everyone is ready.`);
  }

  if (cmd === "/bomb") {
     if (activeGames.has(groupId) && activeGames.get(groupId) !== 'bomb') return reply(`⚠️ Another game (${activeGames.get(groupId)}) is running. Stop it first.`);
     const room = bombEngine.getRoom(groupId);
     if (room && room.state !== "LOBBY") return reply(`⚠️ A bomb game is already running!`);
     activeGames.set(groupId, 'bomb');
     const newRoom = bombEngine.createRoom(groupId, senderName, client);
     newRoom.addPlayer(senderName);
     return reply(`💣 *Bomb Defusal Started!*\n\n${senderName} has created a lobby.\nType */join* to enter.\nType */start* when everyone is ready.`);
  }

  if (cmd === "/numberguessing") {
     if (activeGames.has(groupId) && activeGames.get(groupId) !== 'numberguessing') return reply(`⚠️ Another game (${activeGames.get(groupId)}) is running. Stop it first.`);
     const room = numberGuessingEngine.getRoom(groupId);
     if (room && room.isActive) return reply(`⚠️ A number guessing game is already running!`);
     activeGames.set(groupId, 'numberguessing');
     const newRoom = numberGuessingEngine.createRoom(groupId, senderName, client);
     await newRoom.startGame();
     return;
  }

  if (cmd === "/guessmovie") {
    if (activeGames.has(groupId) && activeGames.get(groupId) !== 'guessmovie') return reply(`⚠️ Another game (${activeGames.get(groupId)}) is running.`);
    const room = guessMovieEngine.getRoom(groupId);
    if (room && room.phase !== "lobby") return reply(`⚠️ A Guess The Movie game is already running!`);
    activeGames.set(groupId, 'guessmovie');
    const newRoom = guessMovieEngine.createRoom(groupId, senderName, client);
    newRoom.addPlayer(senderName);
    return reply(`🎬 *Guess The Movie Started!*\n\n${senderName} created a lobby.\nType */join* to enter.\nType */start* when ready.`);
  }

  if (cmd === "/wordchain") {
    if (activeGames.has(groupId) && activeGames.get(groupId) !== 'wordchain') return reply(`⚠️ Another game is running.`);
    const room = wordChainEngine.getRoom(groupId);
    if (room && room.isActive) return reply(`⚠️ Word Chain is already running!`);
    activeGames.set(groupId, 'wordchain');
    const newRoom = wordChainEngine.createRoom(groupId, senderName, client);
    newRoom.addPlayer(senderName);
    return reply(`🧩 *Word Chain Started!*\n\nBy ${senderName}.\nType */join* to enter.\nType */start* when ready.`);
  }

  if (cmd === "/riddle") {
    if (activeGames.has(groupId) && activeGames.get(groupId) !== 'riddle') return reply(`⚠️ Another game (${activeGames.get(groupId)}) is running.`);
    const room = riddleEngine.getRoom(groupId);
    if (room && room.phase !== "lobby") return reply(`⚠️ A Riddle Battle is already running!`);
    activeGames.set(groupId, 'riddle');
    const newRoom = riddleEngine.createRoom(groupId, senderName, client);
    newRoom.addPlayer(senderName);
    return reply(`🧠 *Riddle Battle Started!*\n\n${senderName} created a lobby.\nType */join* to enter.\nType */start* when ready.`);
  }

  // 3. ROUTE UNIVERSAL COMMANDS based on activeGames
  if (!activeGames.has(groupId)) {
     // No game active but they might have typed /join or something
     if (cmd.startsWith("/") && ["/join", "/start", "/stop", "/pass", "/cut"].includes(cmd)) {
         return reply(`⚠️ No game is currently running. Type */game* to see options!`);
     }
     return;
  }

  const currentGame = activeGames.get(groupId);

  // Helper macro to get the room based on the active game
  const getActiveRoom = () => {
      if (currentGame === 'quiz') return quizEngine.getRoom(groupId);
      if (currentGame === 'mafia') return mafiaEngine.getRoom(groupId);
      if (currentGame === 'bomb') return bombEngine.getRoom(groupId);
      if (currentGame === 'numberguessing') return numberGuessingEngine.getRoom(groupId);
      if (currentGame === 'guessmovie') return guessMovieEngine.getRoom(groupId);
      if (currentGame === 'wordchain') return wordChainEngine.getRoom(groupId);
      if (currentGame === 'riddle') return riddleEngine.getRoom(groupId);
  };
  const room = getActiveRoom();

  if (!room) {
      activeGames.delete(groupId);
      return; // cleanup stale state
  }

  if (cmd === "/stop") {
      let isHost = senderName === room.hostName;

      if (!isHost) return reply(`⚠️ Only the host (${room.hostName}) can stop the game.`);
      
      if (currentGame === 'quiz') quizEngine.deleteRoom(groupId);
      if (currentGame === 'mafia') mafiaEngine.deleteRoom(groupId);
      if (currentGame === 'bomb') bombEngine.deleteRoom(groupId);
      if (currentGame === 'numberguessing') numberGuessingEngine.deleteRoom(groupId);
      if (currentGame === 'guessmovie') guessMovieEngine.deleteRoom(groupId);
      if (currentGame === 'wordchain') wordChainEngine.deleteRoom(groupId);
      if (currentGame === 'riddle') riddleEngine.deleteRoom(groupId);

      activeGames.delete(groupId);
      return reply(`🛑 *Game ended by ${senderName}.*\nType /game to play something else!`);
  }

  // Pass remaining input and commands to active engine
  if (currentGame === 'quiz') {
      if (cmd === "/join") {
          if (room.phase !== "lobby") return reply(`⚠️ Game has already started!`);
          if (!room.addPlayer(senderName)) return reply(`⚠️ You already joined!`);
          return reply(`✅ *${senderName}* joined the quiz. (${room.players.size} players)`);
      }
      if (cmd === "/start") {
          if (room.phase !== "lobby") return reply(`⚠️ Game has already started!`);
          if (senderName !== room.hostName) return reply(`⚠️ Only host can start!`);
          if (room.players.size < 1) return reply(`⚠️ Need at least 1 player.`);
          return room.startGame();
      }
      
      if (body.match(/^[a-z]$/i)) { 
          if (room.phase === "topic_selection") {
              await room.handleTopicVote(senderName, body);
          } else if (room.phase === "question") {
              await room.handleAnswer(senderName, body);
          }
      }
  } 
  else if (currentGame === 'mafia') {
      if (cmd === "/join") {
          if (room.phase !== "lobby") return reply(`⚠️ Game has already started!`);
          const wid = msg.author || msg.from;
          if (!room.addPlayer(senderName, wid)) return reply(`⚠️ You already joined!`);
          return reply(`👤 *${senderName}* joined Mafia! (${room.players.size} players)`);
      }
      if (cmd === "/start") {
          if (room.phase !== "lobby") return reply(`⚠️ Game has already started!`);
          if (senderName !== room.hostName) return reply(`⚠️ Only host can start!`);
          if (room.players.size < 3) return reply(`⚠️ Need at least 3 players. Use dev commands if you want to test.`);
          return room.startGame();
      }
      // Catch mafia specific commands like /vote
      if (typeof room.handleGroupMessage === "function") {
          await room.handleGroupMessage(senderName, msg, client);
      }
  }
  else if (currentGame === 'bomb') {
      if (cmd === "/join") {
          if (room.state !== "LOBBY") return reply(`⚠️ Game has already started!`);
          if (!room.addPlayer(senderName)) return reply(`⚠️ You already joined!`);
          return reply(`💣 *${senderName}* joined Bomb Defusal! (${room.players.size} players)`);
      }
      if (cmd === "/start") {
          if (room.state !== "LOBBY") return reply(`⚠️ Game has already started!`);
          if (senderName !== room.hostName) return reply(`⚠️ Only host can start!`);
          if (room.players.size < 2) return reply(`⚠️ Need at least 2 players.`);
          return room.startGame();
      }
      // Bomb uses raw numbers or /pass /cut
      if (typeof room.checkMessage === "function") {
         await room.checkMessage(senderName, msg.body);
      }
  }
  else if (currentGame === 'numberguessing') {
      const handled = await room.handleMessage(senderName, msg);
      if (handled) {
         if (!room.isActive) activeGames.delete(groupId);
      }
  }
  else if (currentGame === 'guessmovie') {
      if (cmd === "/join") {
          if (room.phase !== "lobby") return reply(`⚠️ Game started!`);
          if (!room.addPlayer(senderName)) return reply(`⚠️ You already joined!`);
          return reply(`🎬 *${senderName}* joined Guess The Movie!`);
      }
      if (cmd === "/start") {
          if (room.phase !== "lobby") return reply(`⚠️ Game already started!`);
          if (senderName !== room.hostName) return reply(`⚠️ Only host can start!`);
          return room.startGame();
      }
      const handled = await room.handleMessage(senderName, msg);
      if (handled && room.phase === "gameover") activeGames.delete(groupId);
  }
  else if (currentGame === 'wordchain') {
      if (cmd === "/join") {
          if (room.isActive) return reply(`⚠️ Game started!`);
          if (!room.addPlayer(senderName)) return reply(`⚠️ You already joined!`);
          return reply(`🧩 *${senderName}* joined the Word Chain!`);
      }
      if (cmd === "/start") {
          if (room.isActive) return reply(`⚠️ Game already started!`);
          if (senderName !== room.hostName) return reply(`⚠️ Only host can start!`);
          return room.startGame();
      }
      const handled = await room.handleMessage(senderName, msg);
      if (handled && !room.isActive) activeGames.delete(groupId);
  }
  else if (currentGame === 'riddle') {
      if (cmd === "/join") {
          if (room.phase !== "lobby") return reply(`⚠️ Game started!`);
          if (!room.addPlayer(senderName)) return reply(`⚠️ You already joined!`);
          return reply(`🧠 *${senderName}* joined the Riddle Battle!`);
      }
      if (cmd === "/start") {
          if (room.phase !== "lobby") return reply(`⚠️ Game already started!`);
          if (senderName !== room.hostName) return reply(`⚠️ Only host can start!`);
          return room.startGame();
      }
      const handled = await room.handleMessage(senderName, msg);
      if (handled && room.phase === "gameover") activeGames.delete(groupId);
  }

  // Cross-check one more time in case engines naturally ended
  if (room && ((currentGame === 'quiz' && room.phase === 'lobby' && activeGames.get(groupId) === 'quiz' && room.totalQuestions > 0 /* meaning it just naturally finished */) ||
               (currentGame === 'mafia' && room.phase === 'lobby' && activeGames.get(groupId) === 'mafia' && room.dayNumber > 1) ||
               (currentGame === 'bomb' && room.state === 'LOBBY' && activeGames.get(groupId) === 'bomb' && room.players.size === 0) ||
               (currentGame === 'numberguessing' && !room.isActive)
  )) {
       // Just a loose safety net to kill state if natural end
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
client.initialize();
