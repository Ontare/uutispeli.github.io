

// ===== CONFIGURATION =====
const PLAYFIELD_ROWS = 4; // Number of visible rows in the playfield

// Add or modify RSS feed URLs here
const RSS_FEEDS = {
  recent: "https://www.hs.fi/rss/tuoreimmat.xml",
  sport: "https://www.hs.fi/rss/urheilu.xml",
  finland: "https://www.hs.fi/rss/suomi.xml",
};

/**
 * Gets the URL for the selected category
 */
function getCategoryURL(category) {
  if (category === 'all') {
    const categories = Object.keys(RSS_FEEDS);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    console.log(`Selected random category: ${randomCategory}`);
    return RSS_FEEDS[randomCategory];
  }
  return RSS_FEEDS[category] || RSS_FEEDS.recent;
}

/**
 * Builds the proxy URL for fetching RSS feed
 */
function buildProxyURL(rssUrl) {
  return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(rssUrl);
}

// ===== GRID FUNCTIONS =====

let grid = [];
let originalAsteriskPositions = []; // Track which positions originally had '*'
let originalContent = []; // Track the original content (letters) that should be in each position

/**
 * Returns a random character from Finnish alphabet
 */
function getRandomCharacter() {
  const finnishAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
  return finnishAlphabet[Math.floor(Math.random() * finnishAlphabet.length)];
}

/**
 * Replaces all '*' characters in the grid with random characters
 */
function replaceAsterisksWithRandomChars() {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col][0] === '*') {
        grid[row][col][0] = getRandomCharacter();
      }
    }
  }
  console.log('Replaced all asterisks with random characters');
}

/**
 * Shuffles the board by performing random column moves
 */
function shuffleBoard() {
  const numCols = grid[0].length;
  const numRows = grid.length;
  const shuffleMoves = 15 + Math.floor(Math.random() * 15); // 15-30 random moves

  console.log(`Shuffling board with ${shuffleMoves} random moves...`);

  for (let i = 0; i < shuffleMoves; i++) {
    // Pick a random column
    const randomCol = Math.floor(Math.random() * numCols);
    // Pick a random shift amount (1 to numRows-1)
    const randomShift = 1 + Math.floor(Math.random() * (numRows - 1));

    // Perform the move (without rendering or checking win)
    const columnValues = grid.map(row => row[randomCol][0]);
    const shift = randomShift % numRows;
    const rotated = columnValues.slice(-shift).concat(columnValues.slice(0, -shift));

    for (let r = 0; r < numRows; r++) {
      grid[r][randomCol][0] = rotated[r];
    }
  }

  console.log('Board shuffled!');
}

// Helper: Find longest row length
function findLongestRow(matrix) {
  let longest = 0;
  for (const row of matrix) {
    if (row.length > longest) longest = row.length;
  }
  return longest;
}

// Function to build the full grid
function buildGrid(baseMatrix) {
  const longest = findLongestRow(baseMatrix);

  // Pad shorter rows alternately with '*'
  for (const row of baseMatrix) {
    if (row.length < longest) {
      const deficit = longest - row.length;
      for (let i = 0; i < deficit; i++) {
        if (i % 2 === 0) {
          row.unshift(['*']);
        } else {
          row.push(['*']);
        }
      }
    }
  }

  // Add two all-* rows at the bottom
  const extraRow = Array(longest).fill(['*']);
  baseMatrix.push(extraRow.map(() => ['*']));
  baseMatrix.push(extraRow.map(() => ['*']));

  // Record which positions originally had '*' AND save the original content (only in playfield rows 0-3)
  originalAsteriskPositions = [];
  originalContent = [];

  for (let row = 0; row < PLAYFIELD_ROWS; row++) {
    originalAsteriskPositions[row] = [];
    originalContent[row] = [];
    for (let col = 0; col < baseMatrix[row].length; col++) {
      const char = baseMatrix[row][col][0];
      originalAsteriskPositions[row][col] = (char === '*');
      originalContent[row][col] = char; // Store original character (letter or *)
    }
  }

  return baseMatrix;
}

// Render the entire grid
// Dim positions that originally had '*' in rows 0-3
// Also dim rows below 3
function renderGrid() {
  const table = document.getElementById("grid");
  table.innerHTML = "";

  // Render only the playfield rows (0 to PLAYFIELD_ROWS-1)
  for (let rowIndex = 0; rowIndex < PLAYFIELD_ROWS; rowIndex++) {
    const row = grid[rowIndex];
    const tr = document.createElement("tr");

    row.forEach((cell, colIndex) => {
      const td = document.createElement("td");
      const char = cell[0];

      td.textContent = char;

      // Check if this position originally had '*'
      if (originalAsteriskPositions[rowIndex] && originalAsteriskPositions[rowIndex][colIndex]) {
        td.classList.add('dimmed');
      }
      // Otherwise, show it lit
      else {
        td.classList.remove('dimmed');
      }

      tr.appendChild(td);
    });
    table.appendChild(tr);
  }
}

// Render arrow buttons - one arrow per column
function renderArrows() {
  const upArrows = document.getElementById("upArrows");
  const downArrows = document.getElementById("downArrows");

  upArrows.innerHTML = "";
  downArrows.innerHTML = "";

  const numCols = grid[0].length;

  for (let col = 0; col < numCols; col++) {
    // Up arrow
    const upBtn = document.createElement("button");
    upBtn.className = "arrow-btn";
    upBtn.textContent = "▲";
    upBtn.onclick = () => moveColumn(col, -1);
    upArrows.appendChild(upBtn);

    // Down arrow
    const downBtn = document.createElement("button");
    downBtn.className = "arrow-btn";
    downBtn.textContent = "▼";
    downBtn.onclick = () => moveColumn(col, 1);
    downArrows.appendChild(downBtn);
  }
}

// Move column logic - rotates the entire column in the underlying grid
function moveColumn(colIndex, shift) {
  const numRows = grid.length;

  // Extract all values from this column
  const columnValues = grid.map(row => row[colIndex][0]);

  // Normalize shift (handle negatives)
  shift = ((shift % numRows) + numRows) % numRows;

  // Rotate the column values
  const rotated = columnValues.slice(-shift).concat(columnValues.slice(0, -shift));

  // Put the rotated values back into the grid
  for (let r = 0; r < numRows; r++) {
    grid[r][colIndex][0] = rotated[r];
  }

  // Re-render to show the changes
  // Original asterisk positions stay dimmed
  renderGrid();
  checkWin();
}

// Check if player has won - all original letter positions (0-3) have the correct letter
function checkWin() {
  let allCorrect = true;

  // Check only the playfield rows (0-3)
  for (let row = 0; row < PLAYFIELD_ROWS; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      // Only check positions that originally had letters (not *)
      if (!originalAsteriskPositions[row][col]) {
        const currentChar = grid[row][col][0];
        const correctChar = originalContent[row][col];

        if (currentChar !== correctChar) {
          allCorrect = false;
          break;
        }
      }
    }
    if (!allCorrect) break;
  }

  const message = document.getElementById("message");
  if (allCorrect) {
    message.textContent = "🎉 You won! The headline is revealed!";
    message.style.color = "#4caf50";
  } else {
    message.textContent = "";
  }
}

// ===== RSS FEED FUNCTIONS =====

async function titleSearch(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();

    const titlesList = [];
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
    let match;

    let firstMatch = true;

    while ((match = titleRegex.exec(xmlText)) !== null) {
      if (firstMatch) {
        firstMatch = false;
        continue;
      }

      const title = match[1].toUpperCase();
      const parts = title.split("|");

      if (parts.length > 1) {
        parts[1] = parts[1].trim();
      }

      titlesList.push(parts);
    }

    console.log(titlesList);
    return titlesList;
  } catch (error) {
    console.error("Error fetching headlines:", error);
    return [];
  }
}

// ===== SYLLABICATION FUNCTIONS =====

function splitFinnishSyllables(word) {
  word = word.toLowerCase();
  const vowels = 'aeiouyäö';
  const consonants = 'bcdfghjklmnpqrstvwxz';

  const syllables = [];
  let currentSyllable = '';

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    currentSyllable += char;

    if (i < word.length - 1) {
      const nextChar = word[i + 1];
      const nextNextChar = i < word.length - 2 ? word[i + 2] : '';

      if (vowels.includes(char) && vowels.includes(nextChar)) {
        const diphthongs = ['ai', 'ei', 'oi', 'ui', 'yi', 'äi', 'öi',
                           'au', 'eu', 'ou', 'iu', 'ey', 'äy', 'öy',
                           'ie', 'uo', 'yö'];
        const pair = char + nextChar;

        if (!diphthongs.includes(pair)) {
          syllables.push(currentSyllable);
          currentSyllable = '';
        }
      }
      else if (vowels.includes(char) && consonants.includes(nextChar)) {
        if (vowels.includes(nextNextChar)) {
          syllables.push(currentSyllable);
          currentSyllable = '';
        }
      }
      else if (consonants.includes(char) && consonants.includes(nextChar)) {
        const clusters = ['ch', 'sh', 'th', 'kh', 'ks', 'st', 'sk', 'sp', 'tr', 'kr', 'pr', 'pl', 'kl'];
        const pair = char + nextChar;

        if (i > 0 && !clusters.includes(pair)) {
          syllables.push(currentSyllable);
          currentSyllable = '';
        }
      }
    }
  }

  if (currentSyllable) {
    syllables.push(currentSyllable);
  }

  return syllables.length > 0 ? syllables : [word];
}

function findBestSplitPoint(text, targetIndex, tolerance = 15) {
  let bestSpaceIndex = -1;
  let bestSpaceDistance = Infinity;

  for (let i = Math.max(0, targetIndex - tolerance); i < Math.min(text.length, targetIndex + tolerance); i++) {
    if (text[i] === ' ') {
      const distance = Math.abs(i - targetIndex);
      if (distance < bestSpaceDistance) {
        bestSpaceDistance = distance;
        bestSpaceIndex = i;
      }
    }
  }

  if (bestSpaceIndex !== -1) {
    return { index: bestSpaceIndex, isMidWord: false };
  }

  let wordStart = targetIndex;
  while (wordStart > 0 && text[wordStart - 1] !== ' ') {
    wordStart--;
  }

  let wordEnd = targetIndex;
  while (wordEnd < text.length && text[wordEnd] !== ' ') {
    wordEnd++;
  }

  const word = text.substring(wordStart, wordEnd);
  const syllables = splitFinnishSyllables(word);

  let currentPos = wordStart;
  let bestSyllableIndex = targetIndex;
  let bestSyllableDistance = Infinity;

  for (let i = 0; i < syllables.length - 1; i++) {
    currentPos += syllables[i].length;
    const distance = Math.abs(currentPos - targetIndex);
    if (distance < bestSyllableDistance) {
      bestSyllableDistance = distance;
      bestSyllableIndex = currentPos;
    }
  }

  return { index: bestSyllableIndex, isMidWord: true };
}

function createRandomTitleMatrix(titlesList, numRows = 3, maxLength = 80) {
  if (!titlesList || titlesList.length === 0) {
    console.error("No titles available");
    return [[['*']]];
  }

  if (numRows < 2 || numRows > 4) {
    console.warn(`Invalid numRows: ${numRows}. Using 3 instead.`);
    numRows = 3;
  }

  const validTitles = titlesList.filter(title => {
    const headline = title.length > 1 ? title[1] : title[0];
    return headline.length <= maxLength;
  });

  if (validTitles.length === 0) {
    console.warn(`No titles found under ${maxLength} characters. Using all titles and truncating.`);
    const randomIndex = Math.floor(Math.random() * titlesList.length);
    const randomTitle = titlesList[randomIndex];
    let headline = randomTitle.length > 1 ? randomTitle[1] : randomTitle[0];

    if (headline.length > maxLength) {
      headline = headline.substring(0, maxLength);
      const lastSpace = headline.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.8) {
        headline = headline.substring(0, lastSpace);
      }
      headline = headline.trim() + '...';
      console.log(`Truncated headline to: ${headline}`);
    }

    return splitHeadlineIntoMatrix(headline, numRows);
  }

  const randomIndex = Math.floor(Math.random() * validTitles.length);
  const randomTitle = validTitles[randomIndex];
  const headline = randomTitle.length > 1 ? randomTitle[1] : randomTitle[0];

  console.log(`Selected headline: ${headline} (length: ${headline.length})`);

  return splitHeadlineIntoMatrix(headline, numRows);
}

function splitHeadlineIntoMatrix(headline, numRows) {
  console.log(`Splitting into ${numRows} rows`);

  const targetCharsPerRow = headline.length / numRows;
  const matrix = [];
  let startIndex = 0;

  for (let i = 0; i < numRows; i++) {
    let endIndex;

    if (i === numRows - 1) {
      endIndex = headline.length;
      let substring = headline.substring(startIndex, endIndex).trim();

      if (substring.length > 0) {
        const row = substring.split('').map(char => [char]);
        matrix.push(row);
      }
    } else {
      const targetEnd = Math.round(startIndex + targetCharsPerRow);
      const splitResult = findBestSplitPoint(headline, targetEnd, 20);
      endIndex = splitResult.index;

      let substring = headline.substring(startIndex, endIndex).trim();

      if (splitResult.isMidWord) {
        substring += '-';
      }

      if (substring.length > 0) {
        const row = substring.split('').map(char => [char]);
        matrix.push(row);
      }

      startIndex = splitResult.isMidWord ? endIndex : endIndex + 1;
    }
  }

  console.log('Row lengths:', matrix.map(row => row.length));

  return matrix;
}

// ===== GAME INITIALIZATION =====

async function startNewGame() {
  const category = document.getElementById("categorySelect").value;
  console.log(`Starting new game with category: ${category}`);

  const rssUrl = getCategoryURL(category);
  const proxyUrl = buildProxyURL(rssUrl);

  const titles = await titleSearch(proxyUrl);
  const numRows = 4;
  const maxLength = 60;
  const matrix = createRandomTitleMatrix(titles, numRows, maxLength);
  console.log(matrix);
  grid = buildGrid(matrix);

  // Replace all asterisks with random characters
  replaceAsterisksWithRandomChars();

  // Shuffle the board to scramble it
  shuffleBoard();

  // Render the shuffled board
  renderGrid();
  renderArrows();

  document.getElementById("message").textContent = "";
}

document.getElementById("newGameBtn").addEventListener("click", startNewGame);

// Initial game load
startNewGame();