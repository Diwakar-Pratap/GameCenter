function getFrame(mistakes, taunt) {
  const frames = [
    `🟫🟫🟫🟫🟫🟫
🟫🟦🟦🟦🪢🟦
🟫🟦🟦🟦🤔💭 *"${taunt}"*
🟫🟦🟦🟦🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟫🟫🟫🟫🟫`,

    `🟫🟫🟫🟫🟫🟫
🟫🟦🟦🟦🪢🟦
🟫🟦🟦🟦😟💭 *"${taunt}"*
🟫🟦🟦🟦🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟫🟫🟫🟫🟫`,

    `🟫🟫🟫🟫🟫🟫
🟫🟦🟦🟦🪢🟦
🟫🟦🟦🟦😨💭 *"${taunt}"*
🟫🟦🟦🟦👕🟦
🟫🟦🟦🟦🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟫🟫🟫🟫🟫`,

    `🟫🟫🟫🟫🟫🟫
🟫🟦🟦🟦🪢🟦
🟫🟦🟦🟦😰💭 *"${taunt}"*
🟫🟦🟦💪👕🟦
🟫🟦🟦🟦🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟫🟫🟫🟫🟫`,

    `🟫🟫🟫🟫🟫🟫
🟫🟦🟦🟦🪢🟦
🟫🟦🟦🟦😱💭 *"${taunt}"*
🟫🟦🟦💪👕💪
🟫🟦🟦🟦🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟫🟫🟫🟫🟫`,

    `🟫🟫🟫🟫🟫🟫
🟫🟦🟦🟦🪢🟦
🟫🟦🟦🟦😭💭 *"${taunt}"*
🟫🟦🟦💪👕💪
🟫🟦🟦🦵🟦🟦
🟫🟦🟦🟦🟦🟦
🟫🟫🟫🟫🟫🟫`,

    `🟫🟫🟫🟫🟫🟫
🟫🟦🟦🟦🪢🟦
🟫🟦🟦🟦💀💭 *"${taunt}"*
🟫🟦🟦🦴👕🦴
🟫🟦🟦🦵🟦🦵
🟫🟦🟦🟦🟦🟦
🟫🟫🟫🟫🟫🟫`
  ];
  return frames[mistakes];
}

const taunts = {
  wrong: [
    "Is that the best you can do, bub?",
    "You're getting me closer to the rope!",
    "My neck is getting awfully itchy...",
    "Are you guessing with your eyes closed?",
    "Yikes! Another one bites the dust.",
    "Ouch! That letter isn't anywhere in here!",
    "I'm shaking in my boots! Try again!",
    "Oh brother! Not even close.",
    "Do you even know the alphabet?"
  ],
  correct: [
    "Phew! Dodged a bullet there.",
    "Hey! You actually got one!",
    "Lucky guess, pal...",
    "Alright, don't get cocky now.",
    "Nice one! Keep it up!",
    "Aha! A glimmer of hope!",
    "Not bad for a rookie.",
    "You found a letter! Call the press!"
  ],
  win: [
    "Curses! Foiled again! You got me!",
    "Alright, you win this round. Now let me down!",
    "I'm free! The rope is loose! Good job!"
  ],
  lose: [
    "That's all folks! I'm a goner!",
    "GAAHK! *cartoon neck crack*",
    "Well, it's been nice knowing ya. *thud*"
  ],
  alreadyGuessed: [
    "Hey pal, you already tried that letter!",
    "I might be hanging, but you're the one losing your memory!",
    "We've been through this letter already! Try something else!"
  ]
};

function getRandomTaunt(type) {
  const list = taunts[type] || taunts.wrong;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  getFrame,
  getRandomTaunt
};
