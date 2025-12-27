#!/usr/bin/env node
/**
 * BiDi Text Transformer for RTL Display in LTR Terminals
 *
 * Uses a simplified Unicode Bidirectional Algorithm (UAX #9) to properly
 * transform mixed Hebrew/English/numbers text for display in
 * terminals that don't support native RTL.
 *
 * Usage:
 *   echo "שלום world" | node bidi-transform.js
 *   node bidi-transform.js "שלום world"
 *   node bidi-transform.js --test
 */

// Hebrew Unicode range
const HEBREW_START = 0x0590;
const HEBREW_END = 0x05FF;

// Arabic Unicode range
const ARABIC_START = 0x0600;
const ARABIC_END = 0x06FF;

function isHebrew(char) {
  const code = char.charCodeAt(0);
  return code >= HEBREW_START && code <= HEBREW_END;
}

function isArabic(char) {
  const code = char.charCodeAt(0);
  return code >= ARABIC_START && code <= ARABIC_END;
}

function isRTL(char) {
  return isHebrew(char) || isArabic(char);
}

function isLatin(char) {
  const code = char.charCodeAt(0);
  return (code >= 0x0041 && code <= 0x005A) || // A-Z
         (code >= 0x0061 && code <= 0x007A);   // a-z
}

function isDigit(char) {
  const code = char.charCodeAt(0);
  return code >= 0x0030 && code <= 0x0039;
}

function isWhitespace(char) {
  return char === ' ' || char === '\t';
}

// Mirror characters for RTL display
const MIRRORS = {
  '(': ')', ')': '(',
  '[': ']', ']': '[',
  '{': '}', '}': '{',
  '<': '>', '>': '<',
  '«': '»', '»': '«',
};

function mirrorChar(char) {
  return MIRRORS[char] || char;
}

/**
 * Split text into logical segments (runs of similar content)
 */
function splitIntoSegments(text) {
  const segments = [];
  let current = { text: '', type: null };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let type;

    if (isRTL(char)) {
      type = 'RTL';
    } else if (isLatin(char)) {
      type = 'LTR';
    } else if (isDigit(char)) {
      type = 'NUM';
    } else if (isWhitespace(char)) {
      type = 'WS';
    } else {
      type = 'PUNCT';
    }

    // Group numbers with adjacent digits and separators (for phone numbers, etc.)
    if (type === 'NUM' && current.type === 'NUM') {
      current.text += char;
    }
    // Group punctuation that's part of numbers (like phone: 054-123)
    else if (type === 'PUNCT' && current.type === 'NUM' && (char === '-' || char === '.' || char === ',')) {
      // Look ahead - if followed by digit, keep with number
      if (i + 1 < text.length && isDigit(text[i + 1])) {
        current.text += char;
        continue;
      }
      // Otherwise it's separate punctuation
      if (current.text) segments.push({ ...current });
      current = { text: char, type };
    }
    // Group same types together
    else if (type === current.type) {
      current.text += char;
    }
    // Start new segment
    else {
      if (current.text) {
        segments.push({ ...current });
      }
      current = { text: char, type };
    }
  }

  if (current.text) {
    segments.push(current);
  }

  return segments;
}

/**
 * Determine base direction using first strong character (UAX #9 rule P2)
 */
function getBaseDirection(segments) {
  for (const seg of segments) {
    if (seg.type === 'RTL') return 'RTL';
    if (seg.type === 'LTR') return 'LTR';
  }
  return 'LTR'; // Default to LTR if no strong chars
}

/**
 * Transform text for display in LTR terminal with RTL base direction
 */
function bidiTransform(text) {
  if (!text) return text;

  const segments = splitIntoSegments(text);

  // If no RTL content, return as-is
  const hasRTL = segments.some(s => s.type === 'RTL');
  if (!hasRTL) return text;

  // Determine base direction from first strong character
  const baseDir = getBaseDirection(segments);
  const rtlBase = baseDir === 'RTL';

  // Process each segment
  const processed = segments.map((seg, idx) => {
    if (seg.type === 'RTL') {
      // Reverse Hebrew/Arabic characters and mirror brackets
      return seg.text.split('').reverse().map(mirrorChar).join('');
    } else if (seg.type === 'PUNCT') {
      // Determine punctuation direction from context
      const prevType = idx > 0 ? segments[idx - 1].type : null;
      const nextType = idx < segments.length - 1 ? segments[idx + 1].type : null;

      // Mirror brackets based on RTL context
      if (prevType === 'RTL' || nextType === 'RTL') {
        return seg.text.split('').map(mirrorChar).join('');
      }
      return seg.text;
    } else {
      // LTR, NUM, WS - keep as-is
      return seg.text;
    }
  });

  // For RTL base direction, reverse segment order
  if (rtlBase) {
    return processed.reverse().join('');
  }

  return processed.join('');
}

/**
 * Process multi-line text
 */
function processText(text) {
  return text.split('\n').map(bidiTransform).join('\n');
}

/**
 * Test cases
 */
function runTests() {
  const tests = [
    { input: 'שלום עולם', desc: 'Pure Hebrew' },
    { input: 'שלום', desc: 'Single Hebrew word' },
    { input: 'Hello', desc: 'Pure English' },
    { input: 'שלום world', desc: 'Hebrew then English' },
    { input: 'Hello שלום', desc: 'English then Hebrew' },
    { input: 'File: קובץ.txt', desc: 'English prefix, Hebrew file' },
    { input: '(שלום)', desc: 'Parentheses around Hebrew' },
    { input: 'יש לי 3 תפוחים', desc: 'Number in Hebrew sentence' },
    { input: 'טלפון: 054-1234567', desc: 'Phone number' },
    { input: 'שם: John Smith', desc: 'English name in Hebrew' },
    { input: '[הערה]', desc: 'Brackets around Hebrew' },
    { input: 'ה-ID הוא 123', desc: 'English word embedded' },
    { input: 'error: שגיאה בקובץ', desc: 'Error message' },
  ];

  console.log('BiDi Transform Tests');
  console.log('='.repeat(60));
  console.log('Note: "Input" is logical order, "Output" is visual for LTR terminal\n');

  for (const test of tests) {
    const result = bidiTransform(test.input);
    console.log(`[${test.desc}]`);
    console.log(`  Logical: "${test.input}"`);
    console.log(`  Visual:  "${result}"`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('Visual output should display correctly in your terminal.');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test') || args.includes('-t')) {
    runTests();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
BiDi Text Transformer for RTL in LTR Terminals

Usage:
  node bidi-transform.js "text"          Transform text argument
  echo "text" | node bidi-transform.js   Transform stdin
  node bidi-transform.js --test          Run test cases

Examples:
  node bidi-transform.js "שלום עולם"
  echo "Hello שלום" | node bidi-transform.js
`);
    return;
  }

  // Check for argument
  if (args.length > 0 && !args[0].startsWith('-')) {
    console.log(processText(args.join(' ')));
    return;
  }

  // Read from stdin
  let input = '';
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  if (input) {
    console.log(processText(input.trim()));
  }
}

main().catch(console.error);
