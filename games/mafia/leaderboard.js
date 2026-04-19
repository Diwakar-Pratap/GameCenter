const fs = require('fs');
const path = require('path');

const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

function loadLeaderboard() {
  if (fs.existsSync(LEADERBOARD_FILE)) {
    try {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error("Error reading leaderboard:", e);
      return { Mafia: 0, Villagers: 0 };
    }
  }
  return { Mafia: 0, Villagers: 0 };
}

function saveLeaderboard(data) {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing leaderboard:", e);
  }
}

function addWin(faction) { // "Mafia" or "Villagers"
  const lb = loadLeaderboard();
  if (!lb[faction]) lb[faction] = 0;
  lb[faction]++;
  saveLeaderboard(lb);
}

module.exports = {
  getLeaderboard: loadLeaderboard,
  addWin
};
