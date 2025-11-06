
// ============================================================
// WORD GAME - Finnish Headline Puzzle
// ============================================================
// GAME CONFIGURATION
// ============================================================

const PLAYFIELD_ROWS = 4; // How many rows the player can see and interact with

// RSS feed sources - add more categories here if needed
const RSS_FEEDS = {
  recent: "https://www.hs.fi/rss/tuoreimmat.xml",
  sport: "https://www.hs.fi/rss/urheilu.xml",
  finland: "https://www.hs.fi/rss/suomi.xml",
};

// Language translations
const TRANSLATIONS = {
  fi: {
    gameTitle: "Uutispeli",
    categoryLabel: "Kategoria:",
    newGameBtn: "Uusi peli",
    winMessage: "Voitit! Otsikko on paljastunut!",
    readArticle: "Lue artikkeli",
    categoryAll: "Kaikki",
    categoryRecent: "Tuoreimmat",
    categorySport: "Urheilu",
    categoryFinland: "Suomi"
  },
  en: {
    gameTitle: "News Game",
    categoryLabel: "Category:",
    newGameBtn: "New Game",
    winMessage: "You won! The headline is revealed!",
    readArticle: "Read Article",
    categoryAll: "All",
    categoryRecent: "Recent",
    categorySport: "Sport",
    categoryFinland: "Finland"
  }
};

let currentLanguage = 'fi'; // Default language


// ============================================================
// GAME STATE VARIABLES
// ============================================================

let grid = []; // The main game grid (includes hidden rows for shuffling)
let originalAsteriskPositions = []; // Tracks which cells started as padding (*)
let originalContent = []; // Stores the correct letter for each cell
let currentArticleLink = ''; // Stores the link to the current article


// ============================================================
// LANGUAGE FUNCTIONS
// ============================================================

/**
 * Updates all UI text based on the selected language
 */
function updateLanguage(lang) {
  currentLanguage = lang;
  const t = TRANSLATIONS[lang];

  // Update text elements
  document.getElementById("gameTitle").textContent = t.gameTitle;
  document.getElementById("categoryLabel").textContent = t.categoryLabel;
  document.getElementById("newGameBtn").textContent = t.newGameBtn;

  // Update dropdown options
  const categorySelect = document.getElementById("categorySelect");
  categorySelect.options[0].textContent = t.categoryAll;
  categorySelect.options[1].textContent = t.categoryRecent;
  categorySelect.options[2].textContent = t.categorySport;
  categorySelect.options[3].textContent = t.categoryFinland;

  // Update active flag button
  document.getElementById("finnishBtn").classList.toggle('active', lang === 'fi');
  document.getElementById("englishBtn").classList.toggle('active', lang === 'en');
}


// ============================================================
// RSS FEED & CATEGORY FUNCTIONS
// ============================================================

/**
 * Picks the appropriate RSS feed URL based on the selected category.
 * If "all" is selected, randomly chooses one of the available feeds.
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
 * Wraps the RSS feed URL in a proxy to avoid CORS issues.
 * We can't fetch RSS feeds directly from the browser, so we use a proxy service.
 */
function buildProxyURL(rssUrl) {
  return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(rssUrl);
}

/**
 * Fetches headlines from an RSS feed and extracts the titles and links.
 * Skips the first title (which is usually just the feed name).
 * Returns an array where each item contains the title parts and the article link.
 */
async function titleSearch(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const items = xmlDoc.querySelectorAll("item");

    const titlesList = [];

    items.forEach(item => {
      const titleElement = item.querySelector("title");
      const linkElement = item.querySelector("link");

      if (titleElement && linkElement) {
        const title = titleElement.textContent.toUpperCase();
        const link = linkElement.textContent;
        const parts = title.split("|");

        if (parts.length > 1) {
          parts[1] = parts[1].trim(); // Clean up the main headline part
        }

        // Store both title parts and the link
        titlesList.push({
          title: parts,
          link: link
        });
      }
    });

    console.log(titlesList);
    return titlesList;
  } catch (error) {
    console.error("Error fetching headlines:", error);
    return [];
  }
}


// ============================================================
// FINNISH SYLLABLE SPLITTING LOGIC
// ============================================================
// These functions help split words intelligently at syllable boundaries
// rather than awkwardly in the middle of syllables.

/**
 * Splits a Finnish word into syllables using basic Finnish phonology rules.
 * This helps us break headlines more naturally across rows.
 */
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

      // Check for vowel-vowel boundaries (but respect diphthongs)
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
      // Split after a vowel if followed by consonant-vowel
      else if (vowels.includes(char) && consonants.includes(nextChar)) {
        if (vowels.includes(nextNextChar)) {
          syllables.push(currentSyllable);
          currentSyllable = '';
        }
      }
      // Handle consonant clusters (split between them unless they're common clusters)
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

  // Don't forget the last syllable!
  if (currentSyllable) {
    syllables.push(currentSyllable);
  }

  return syllables.length > 0 ? syllables : [word];
}

/**
 * Finds the best place to split text near a target position.
 * Prefers splitting at spaces, but will split at syllable boundaries if needed.
 */
function findBestSplitPoint(text, targetIndex, tolerance = 15) {
  let bestSpaceIndex = -1;
  let bestSpaceDistance = Infinity;

  // First, try to find a space near our target position
  for (let i = Math.max(0, targetIndex - tolerance); i < Math.min(text.length, targetIndex + tolerance); i++) {
    if (text[i] === ' ') {
      const distance = Math.abs(i - targetIndex);
      if (distance < bestSpaceDistance) {
        bestSpaceDistance = distance;
        bestSpaceIndex = i;
      }
    }
  }

  // If we found a good space, use it
  if (bestSpaceIndex !== -1) {
    return { index: bestSpaceIndex, isMidWord: false };
  }

  // No space found nearby, so we need to split within a word
  // Find the word boundaries around our target
  let wordStart = targetIndex;
  while (wordStart > 0 && text[wordStart - 1] !== ' ') {
    wordStart--;
  }

  let wordEnd = targetIndex;
  while (wordEnd < text.length && text[wordEnd] !== ' ') {
    wordEnd++;
  }

  // Split the word into syllables and find the best syllable boundary
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


// ============================================================
// HEADLINE TEXT PROCESSING
// ============================================================

/**
 * Takes a list of headlines and picks a random one that fits our constraints.
 * Then splits it into rows to create the game grid.
 */
function createRandomTitleMatrix(titlesList, numRows = 3, maxLength = 80) {
  if (!titlesList || titlesList.length === 0) {
    console.error("No titles available");
    currentArticleLink = '';
    return [[['*']]]; // Return a minimal grid if no headlines
  }

  if (numRows < 2 || numRows > 4) {
    console.warn(`Invalid numRows: ${numRows}. Using 3 instead.`);
    numRows = 3;
  }

  // Filter to headlines that aren't too long
  const validTitles = titlesList.filter(item => {
    const headline = item.title.length > 1 ? item.title[1] : item.title[0];
    return headline.length <= maxLength;
  });

  // If no valid titles, pick any one and truncate it
  if (validTitles.length === 0) {
    console.warn(`No titles found under ${maxLength} characters. Using all titles and truncating.`);
    const randomIndex = Math.floor(Math.random() * titlesList.length);
    const randomItem = titlesList[randomIndex];
    currentArticleLink = randomItem.link;
    let headline = randomItem.title.length > 1 ? randomItem.title[1] : randomItem.title[0];

    if (headline.length > maxLength) {
      headline = headline.substring(0, maxLength);
      const lastSpace = headline.lastIndexOf(' ');
      // Try to cut at a word boundary if possible
      if (lastSpace > maxLength * 0.8) {
        headline = headline.substring(0, lastSpace);
      }
      headline = headline.trim() + '...';
    }

    return splitHeadlineIntoMatrix(headline, numRows);
  }

  // Pick a random valid headline
  const randomIndex = Math.floor(Math.random() * validTitles.length);
  const randomItem = validTitles[randomIndex];
  currentArticleLink = randomItem.link;
  const headline = randomItem.title.length > 1 ? randomItem.title[1] : randomItem.title[0];

  return splitHeadlineIntoMatrix(headline, numRows);
}


/**
 * Splits a headline string into multiple rows for the game grid.
 * Tries to split evenly and at natural word/syllable boundaries.
 */
function splitHeadlineIntoMatrix(headline, numRows) {
  const targetCharsPerRow = headline.length / numRows;
  const matrix = [];
  let startIndex = 0;

  for (let i = 0; i < numRows; i++) {
    let endIndex;

    // Last row gets everything remaining
    if (i === numRows - 1) {
      endIndex = headline.length;
      let substring = headline.substring(startIndex, endIndex).trim();

      if (substring.length > 0) {
        const row = substring.split('').map(char => [char]);
        matrix.push(row);
      }
    } else {
      // Find a good split point near our target
      const targetEnd = Math.round(startIndex + targetCharsPerRow);
      const splitResult = findBestSplitPoint(headline, targetEnd, 20);
      endIndex = splitResult.index;

      let substring = headline.substring(startIndex, endIndex).trim();

      // Add a hyphen if we split mid-word
      if (splitResult.isMidWord) {
        substring += '-';
      }

      if (substring.length > 0) {
        const row = substring.split('').map(char => [char]);
        matrix.push(row);
      }

      // Move past the split point (skip space if we split at word boundary)
      startIndex = splitResult.isMidWord ? endIndex : endIndex + 1;
    }
  }

  return matrix;
}


// ============================================================
// GRID BUILDING & MANIPULATION
// ============================================================

/**
 * Returns a random letter from the Finnish alphabet.
 * Used to fill padding spaces with random letters for the puzzle.
 */
function getRandomCharacter() {
  const finnishAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ';
  return finnishAlphabet[Math.floor(Math.random() * finnishAlphabet.length)];
}

/**
 * Finds the longest row in the matrix (needed for padding).
 */
function findLongestRow(matrix) {
  let longest = 0;
  for (const row of matrix) {
    if (row.length > longest) longest = row.length;
  }
  return longest;
}

/**
 * Takes the base matrix of letters and builds a complete game grid.
 * - Pads shorter rows with '*' markers (alternating left/right)
 * - Adds two extra rows at the bottom (for shuffling mechanics)
 * - Records which positions are padding vs real letters
 */
function buildGrid(baseMatrix) {
  const longest = findLongestRow(baseMatrix);

  // Make all rows the same length by padding with '*'
  for (const row of baseMatrix) {
    if (row.length < longest) {
      const deficit = longest - row.length;
      // Alternate padding between start and end for visual balance
      for (let i = 0; i < deficit; i++) {
        if (i % 2 === 0) {
          row.unshift(['*']);
        } else {
          row.push(['*']);
        }
      }
    }
  }

  // Add two extra all-asterisk rows at the bottom
  // These give us room to shuffle the columns around
  const extraRow = Array(longest).fill(['*']);
  baseMatrix.push(extraRow.map(() => ['*']));
  baseMatrix.push(extraRow.map(() => ['*']));

  // Remember which positions are padding and what the correct answer is
  originalAsteriskPositions = [];
  originalContent = [];

  for (let row = 0; row < PLAYFIELD_ROWS; row++) {
    originalAsteriskPositions[row] = [];
    originalContent[row] = [];
    for (let col = 0; col < baseMatrix[row].length; col++) {
      const char = baseMatrix[row][col][0];
      originalAsteriskPositions[row][col] = (char === '*');
      originalContent[row][col] = char; // Store the correct letter/padding
    }
  }

  return baseMatrix;
}

/**
 * Replaces all padding markers ('*') with random letters.
 * This makes the padding less obvious and more puzzle-like.
 */
function replaceAsterisksWithRandomChars() {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col][0] === '*') {
        grid[row][col][0] = getRandomCharacter();
      }
    }
  }
}

/**
 * Scrambles the board by making 15-30 random column moves.
 * This is what makes the game challenging!
 */
function shuffleBoard() {
  const numCols = grid[0].length;
  const numRows = grid.length;
  const shuffleMoves = 15 + Math.floor(Math.random() * 15); // Random between 15-30

  for (let i = 0; i < shuffleMoves; i++) {
    // Pick a random column
    const randomCol = Math.floor(Math.random() * numCols);
    // Pick a random shift amount
    const randomShift = 1 + Math.floor(Math.random() * (numRows - 1));

    // Rotate the column (same logic as player moves)
    const columnValues = grid.map(row => row[randomCol][0]);
    const shift = randomShift % numRows;
    const rotated = columnValues.slice(-shift).concat(columnValues.slice(0, -shift));

    for (let r = 0; r < numRows; r++) {
      grid[r][randomCol][0] = rotated[r];
    }
  }
}


// ============================================================
// GAME MECHANICS - COLUMN MOVEMENT
// ============================================================

/**
 * Rotates a column up or down.
 * Letters wrap around (top letter goes to bottom when moving up, etc).
 */
function moveColumn(colIndex, shift) {
  const numRows = grid.length;

  // Extract all letters from this column
  const columnValues = grid.map(row => row[colIndex][0]);

  // Normalize the shift amount (handle negative shifts properly)
  shift = ((shift % numRows) + numRows) % numRows;

  // Rotate the column values
  const rotated = columnValues.slice(-shift).concat(columnValues.slice(0, -shift));

  // Put the rotated values back into the grid
  for (let r = 0; r < numRows; r++) {
    grid[r][colIndex][0] = rotated[r];
  }

  // Update the display and check if player won
  renderGrid();
  checkWin();
}


// ============================================================
// RENDERING FUNCTIONS
// ============================================================

/**
 * Draws the game grid on the screen.
 * Letters in their correct positions are shown bright.
 * Letters that are padding or out of place are dimmed.
 */
function renderGrid() {
  const table = document.getElementById("grid");
  table.innerHTML = "";

  // Only show the playfield rows (not the hidden bottom rows)
  for (let rowIndex = 0; rowIndex < PLAYFIELD_ROWS; rowIndex++) {
    const row = grid[rowIndex];
    const tr = document.createElement("tr");

    row.forEach((cell, colIndex) => {
      const td = document.createElement("td");
      const char = cell[0];

      td.textContent = char;

      // Dim cells that are padding positions
      if (originalAsteriskPositions[rowIndex] && originalAsteriskPositions[rowIndex][colIndex]) {
        td.classList.add('dimmed');
      } else {
        td.classList.remove('dimmed');
      }

      tr.appendChild(td);
    });
    table.appendChild(tr);
  }
}

/**
 * Creates the up and down arrow buttons for each column.
 * Players click these to rotate the columns.
 */
function renderArrows() {
  const upArrows = document.getElementById("upArrows");
  const downArrows = document.getElementById("downArrows");

  upArrows.innerHTML = "";
  downArrows.innerHTML = "";

  const numCols = grid[0].length;

  for (let col = 0; col < numCols; col++) {
    // Up arrow button
    const upBtn = document.createElement("button");
    upBtn.className = "arrow-btn";
    upBtn.textContent = "▲";
    upBtn.onclick = () => moveColumn(col, -1); // Negative = move up
    upArrows.appendChild(upBtn);

    // Down arrow button
    const downBtn = document.createElement("button");
    downBtn.className = "arrow-btn";
    downBtn.textContent = "▼";
    downBtn.onclick = () => moveColumn(col, 1); // Positive = move down
    downArrows.appendChild(downBtn);
  }
}


// ============================================================
// WIN CONDITION
// ============================================================

/**
 * Checks if the player has solved the puzzle.
 * Win = all real letters (not padding) are back in their correct positions.
 */
function checkWin() {
  let allCorrect = true;

  // Check only the visible playfield rows
  for (let row = 0; row < PLAYFIELD_ROWS; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      // Skip padding positions (they don't matter for winning)
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

  // Show win message if player solved it!
  const message = document.getElementById("message");
  if (allCorrect) {
    message.innerHTML = `
      ${TRANSLATIONS[currentLanguage].winMessage}<br>
      <a href="${currentArticleLink}" target="_blank">
        ${TRANSLATIONS[currentLanguage].readArticle} →
      </a>
    `;
  } else {
    message.innerHTML = "";
  }
}


// ============================================================
// GAME INITIALIZATION
// ============================================================

/**
 * Starts a new game with a fresh headline.
 * Fetches from RSS, builds the grid, scrambles it, and displays it.
 */
async function startNewGame() {
  const category = document.getElementById("categorySelect").value;
  console.log(`Starting new game with category: ${category}`);

  // Get the RSS feed for the selected category
  const rssUrl = getCategoryURL(category);
  const proxyUrl = buildProxyURL(rssUrl);

  // Fetch headlines
  const titles = await titleSearch(proxyUrl);
  const numRows = 4;
  const maxLength = 60;

  // Create the game grid from a random headline
  const matrix = createRandomTitleMatrix(titles, numRows, maxLength);
  console.log(matrix);
  grid = buildGrid(matrix);

  // Replace padding with random letters
  replaceAsterisksWithRandomChars();

  // Scramble the board
  shuffleBoard();

  // Display everything to the player
  renderGrid();
  renderArrows();

  // Clear any previous win message
  document.getElementById("message").textContent = "";
}

// Hook up the "New Game" button
document.getElementById("newGameBtn").addEventListener("click", startNewGame);

// Hook up language buttons
document.getElementById("finnishBtn").addEventListener("click", () => updateLanguage('fi'));
document.getElementById("englishBtn").addEventListener("click", () => updateLanguage('en'));

// Start the first game when the page loads
startNewGame();
