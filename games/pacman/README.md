# 👾 PAC-MAN for WhatsApp

A real-time, emoji-rendered Pac-Man game that runs entirely inside a WhatsApp group chat using live message editing via `whatsapp-web.js`.

---

## 🕹️ How to Play

| Command | Action |
|---------|--------|
| `/pacman` | Create a new Pac-Man session (you become the host) |
| `/start` | Host starts the game |
| `/stop` | Host ends the game |

### Controls
Type any combination of these letters in the group chat to move Pac-Man:

| Key | Direction |
|-----|-----------|
| `w` | ⬆️ Up |
| `a` | ⬅️ Left |
| `s` | ⬇️ Down |
| `d` | ➡️ Right |

> **Tip:** You can chain multiple moves in a single message! Typing `"dds"` moves Pac-Man right twice, then down once.

---

## 🗺️ The Board

```
🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦
🟦⭐✨⭐✨⭐✨⭐✨⭐✨⭐✨⭐✨⭐✨⭐🟦
🟦✨🟦🟦🟦🟦⭐🟦🟦✨⭐🟦🟦✨🟦🟦🟦✨🟦
🟦⭐⬛⬛⬛⬛✨👻⬛👾⬛💀✨😈⬛⬛⬛⭐🟦
🟦✨🟦🟦🟦🟦⭐🟦🟦✨⭐🟦🟦✨🟦🟦🟦✨🟦
🟦⭐✨⭐✨⭐✨⭐✨⭐✨⭐✨⭐✨⭐✨⭐🟦
🟦🟦🟦🟦⭐⬛🟦🟦🟦🟦🟦🟦🟦⬛✨🟦🟦🟦🟦
⬛⬛⬛⬛✨⬛⬛⬛⬛⬛⬛⬛⬛⬛⭐⬛⬛⬛⬛
...
🟦✨⬛⬛⬛⬛⭐⬛⬛😮⬛⬛✨⬛⬛⬛⬛✨🟦  ← Pac-Man
...
🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦
```

### Legend

| Emoji | Meaning |
|-------|---------|
| 🟦 | Wall |
| ⭐ / ✨ | Twinkling dot (+10 pts) |
| 🌟 | Power Pellet (+50 pts, scares ghosts) |
| ⬛ | Empty space |
| 😮 / 😄 | Pac-Man (animated mouth) |
| 👻 👾 💀 😈 | Ghosts (touch = lose a life) |
| 😱 | Scared ghost (eat it for +200 pts!) |
| 💫 | Eaten ghost (respawning) |
| ❤️ | Remaining lives |
| 🖤 | Lost life |

---

## ✨ The Twinkling Effect

The board self-edits every **500 ms** purely to animate the dots.

Every dot alternates between `⭐` and `✨`. Adjacent cells are always on **opposite phases** using a checkerboard formula: `phase = (row + col) % 2`. This means at any given moment, exactly half the board is `⭐` and the other half is `✨`, then they swap — creating a constant, smooth sparkle across the entire maze without any player input.

```
Frame 0:  ⭐✨⭐✨⭐✨     Frame 1:  ✨⭐✨⭐✨⭐
           ✨⭐✨⭐✨⭐                ⭐✨⭐✨⭐✨
           ⭐✨⭐✨⭐✨                ✨⭐✨⭐✨⭐
```

Two timers run simultaneously:
- **`twinkleTimer`** — every 500ms, flips frame (0↔1) and edits the message
- **`gameTimer`** — every 1500ms, moves ghosts and decrements power-up timers

---

## 🎮 Game Rules

- You start with **3 lives** ❤️❤️❤️
- **Eat all dots** to win the game 🏆
- **Touching a ghost** costs you a life 💀
- **Power Pellets** (🌟) scare all ghosts for 10 ticks — eat them for bonus points!
- Ghosts return to their spawn when eaten and become normal again after the scared timer expires
- The game ends automatically when you run out of lives or eat every dot

---

## ⚙️ Technical Details

| Property | Value |
|----------|-------|
| Maze size | 19 × 15 cells |
| Twinkle interval | 500 ms |
| Ghost movement interval | 1500 ms |
| Render method | `msg.edit()` (WhatsApp message editing) |
| Resend threshold | Every 4 player inputs (to keep message visible) |
| Ghost AI | 70% continue current direction, 30% random turn |
