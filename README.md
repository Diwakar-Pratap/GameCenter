# 🎮 WhatsApp Game Center

Welcome to the **WhatsApp Game Center**, a unified Node.js bot powered by `whatsapp-web.js` that turns any WhatsApp group into a live multiplayer arcade!

Instead of running separate Node instances for different games, this centralized router dynamically maps active mini-games to specific WhatsApp groups. It ensures that a group can seamlessly boot up a game, play together, stop it, and switch to another game without any cross-chat command conflicts!

---

## 🕹️ Available Games

Currently, the Game Center features **11** competitive mini-games, each with their own isolated engines, logic, timers, and scoring mechanisms:

1. 🧠 **Quiz** (`/quiz`)
   A frantic trivia game where groups vote on a topic, then battle to answer questions correctly. Speed matters!
2. 🕴️ **Mafia** (`/mafia`)
   A classic social deduction game. The bot randomly assigns secret roles via Direct Messages and manages Day/Night cycles, voting, and eliminations directly in the group chat.
3. 💣 **Bomb Defusal** (`/bomb`)
   A fast-paced hot potato game! A "bomb" timer drops randomly. You must successfully pass or cut specific wires to survive before it blows up!
4. 🔢 **Number Guessing** (`/numberguessing`)
   A rapid-fire Higher/Lower guessing game to find the bot's secret hidden number. 
5. 🎬 **Guess the Movie** (`/guessmovie`)
   A customized trivia engine where you guess popular Bollywood and South Indian movies by interpreting emojis, epic dialogues, or famous song lyrics.
6. 🧩 **Word Chain** (`/wordchain`)
   A 60-second blitz "Antakshari" mode! Hook up English words (validated instantly against a live Dictionary API) or popular Indian blockbusters. The new word must start with the last letter of the previous one!
7. 🧙‍♂️ **Riddle Battle** (`/riddle`)
   Challenge your friends with mind-bending (and hilarious) riddles! It awards you for quick thinking. Guess wrong? Expect to be publicly taunted by the bot. 
8. ❌ **Tic-Tac-Toe** (`/tictactoe`)
   Challenge a friend to a 1v1 duel of Tic-Tac-Toe directly in the chat! Use numbers 1-9 to make your move.
9. 🧱 **Tetris** (`/tetris`)
   Yes, actual real-time Tetris running inside a WhatsApp chat via live message edits! Compete for the high score.
10. 🪢 **Hangman** (`/hangman`)
    The classic word-guessing game featuring big colorful emoji graphics and hilarious cartoon taunts! Team up to guess the word before the gallows are complete.
11. 👾 **Pac-Man** (`/pacman`)
    Real-time emoji Pac-Man running inside WhatsApp via live message edits! The board features a twinkling ⭐✨ checkerboard dot effect that flickers every 500ms. Navigate with `w a s d`, grab 🌟 power pellets to scare 😱 ghosts, and eat all dots to win!

---

## 🏗️ Project Architecture

The core of the Game Center rests in the `index.js` file, which intercept all incoming WhatsApp messages and smartly routes them:

```
GameCenter/
│
├── index.js            # The Central Router & Client Manager 
├── package.json
└── games/              # Individual game engines
    ├── bomb/
    ├── guessmovie/
    ├── hangman/
    ├── mafia/
    ├── numberguessing/
    ├── quiz/
    ├── riddles/
    ├── tetris/
    ├── tictactoe/
    ├── wordchain/
    └── pacman/
```

### The Router Concept
The `index.js` uses a central `activeGames Map()` to bind a `groupId` to a specific game. If a user in a group starts a game, all subsequent messages from that group are silently forwarded *only* to that specific game's engine until the Host manually terminates it using `/stop`. 

---

## 🚀 Setup & Installation

### Requirements
- Node.js installed on your machine.
- A dedicated WhatsApp number/account to act as the Game Bot.

### 1. Install Dependencies
Navigate to the root directory and install `whatsapp-web.js` and `qrcode`:
```bash
npm install whatsapp-web.js qrcode
```

### 2. Start the Server
Run the root index file:
```bash
node index.js
```

### 3. Authenticate
On the very first run, a QR code will be generated and opened automatically as a `.png` image.
Open WhatsApp on the device you want to use as the bot, go to **Linked Devices**, and scan the QR code.

The bot will save your session in a `.wwebjs_auth` folder. You will not need to scan the QR code for subsequent restarts!

---

## 🕹️ How to Play

1. **Add the Bot** to any WhatsApp group!
2. Type `/game` to see the global menu.
3. Type the start command of the game you want (e.g. `/riddle`). 
4. The bot will open a lobby. Other group members type `/join` to enter.
5. The person who started the lobby types `/start` to lock the lobby and begin the game!
6. To end the session and return the group to an idle state, the host types `/stop`.

---

## 🛠️ Other Utilities

The bot also features some cool visual tricks for your chats!

- **LED Marquee:** `/other led <your message>`
  Creates a giant scrolling LED text banner using Braille characters.
  
- **Emoji LED Marquee:** `/other emojiled <H🔥 e💀 l💯 l💯 o🎉>`
  Creates a giant scrolling LED banner built out of specific emojis that you choose! Add underscores `_` for spaces.

- **Pac-Man Twinkle Board:** While Pac-Man is running, the board self-edits every **500ms** to create a live ⭐↔✨ twinkling effect across all dots using a checkerboard phase pattern — even when no one is moving!

---

Enjoy the competitive chaos! 🔥
