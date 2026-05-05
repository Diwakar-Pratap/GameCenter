/**
 * ledText.js
 * ──────────
 * LED Marquee animation engine using figlet.
 */
const figlet = require('figlet');


/**
 * Returns a 16-element array of strings representing the entire zoomed text grid.
 */
function buildTextGrid(text, isEmojiLed = false) {
    const grid = Array(16).fill("");
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    
    let items = [];
    
    if (isEmojiLed) {
        const rawSegments = [...segmenter.segment(text)].map(s => s.segment).filter(s => s !== ' ');
        let i = 0;
        while (i < rawSegments.length) {
            let s = rawSegments[i];
            
            if (s === '_') {
                items.push({ char: ' ', emoji: ' ' });
                i++;
                continue;
            }

            let char = s.toUpperCase();
            let emoji = rawSegments[i + 1];

            if (emoji && emoji !== '_' && !/^[a-zA-Z0-9]$/.test(emoji)) {
                items.push({ char, emoji });
                i += 2;
            } else {
                items.push({ char, emoji: '🟩' });
                i += 1;
            }
        }
    } else {
        const upper = text.toUpperCase();
        const chars = [...segmenter.segment(upper)].map(s => s.segment);
        items = chars.map(c => ({ char: c, emoji: null }));
    }
    
    for (let item of items) {
        let char = item.char;
        let emoji = item.emoji;
        // If it's a space, just add some padding
        if (char === ' ') {
            for (let i = 0; i < 16; i++) grid[i] += "          "; // 10 spaces for doubled width
            continue;
        }

        // Generate the banner font for the character
        let art = "";
        try {
            art = figlet.textSync(char, { font: 'Banner' });
        } catch (e) {
            art = "";
        }
        
        if (!art || art.trim() === "") {
            // Fallback for emojis or unsupported chars: a solid block shape
            art = [
                "  ####  ",
                " ###### ",
                "########",
                "########",
                "########",
                " ###### ",
                "  ####  ",
                "        "
            ].join('\n');
        }
        
        const rows = art.split('\n');
        // Banner font is up to 8 rows high.
        for (let i = 0; i < 8; i++) {
            let origRow = rows[i] || '';
            let doubledStr = '';
            for (let c of origRow) {
                if (c === ' ') {
                    doubledStr += '\u2800\u2800'; // Double space using Braille blank
                } else {
                    if (isEmojiLed && emoji) {
                        doubledStr += emoji;
                    } else {
                        doubledStr += char + char; // Double the character/emoji
                    }
                }
            }
            
            grid[i * 2] += doubledStr + "\u2800\u2800\u2800\u2800";
            grid[i * 2 + 1] += doubledStr + "\u2800\u2800\u2800\u2800";
        }
    }
    return grid;
}

/**
 * Animate the LED marquee in a chat.
 */
async function animateLED(groupId, text, client, isRunning = () => true, isEmojiLed = false) {
    let msg;
    try {
        msg = await client.sendMessage(groupId, "```\n[Starting LED Marquee...]\n```");
    } catch(err) {
        console.error("Failed to send initial LED msg:", err);
        return;
    }

    const windowWidth = 46; // Wider window for WhatsApp Web
    
    // We pad with just 1 space so the text appears instantly and isn't just an empty green box
    // For emoji LED, space is _, so we use _ for padding
    const paddedText = isEmojiLed ? "_" + text + "___" : " " + text + "   ";
    
    const fullGrid = buildTextGrid(paddedText, isEmojiLed);
    const totalCols = fullGrid[0].length;
    
    let frames = 0;
    let startCol = 0;
    // Slide the window across the grid infinitely until stopped
    while (isRunning()) {
        let frameText = "```\n";
        for (let row = 0; row < 16; row++) {
            let slice = fullGrid[row].substring(startCol, startCol + windowWidth);
            // Pad the slice if it's too short at the end
            if (slice.length < windowWidth) slice = slice.padEnd(windowWidth, "\u2800");
            frameText += slice + "\n";
        }
        frameText += "```";

        try {
            if (typeof msg.edit === 'function') {
                await msg.edit(frameText);
            } else {
                await msg.delete(true).catch(()=>{});
                msg = await client.sendMessage(groupId, frameText);
            }
        } catch(err) {
            break;
        }

        frames++;
        if (frames > 500) break; // Absolute safety limit: ~2.5 mins of scrolling
        
        startCol += 4;
        if (startCol >= totalCols) {
            startCol = 0; // Wrap around infinitely
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

module.exports = {
    animateLED
};
