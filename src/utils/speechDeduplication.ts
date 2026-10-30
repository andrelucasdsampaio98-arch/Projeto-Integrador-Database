/**
 * Utility for speech recognition text deduplication, overlap removal,
 * and subtitle smoothing in Portuguese.
 *
 * Designed to prevent repetitions caused by:
 * - Web Speech API chunk overlap / session boundary repetition
 * - Audio echo / microphone feedback loops
 * - Natural stuttering and speech disfluencies ("o o", "para para", "é é")
 * - Repeated multi-word clauses ("vamos começar vamos começar")
 * - Interim transcript flicker against finalized transcript
 */

// Common Portuguese filler words / hesitations that often stutter or repeat
const COMMON_FILLERS = new Set([
  'é', 'eh', 'tipo', 'tipo assim', 'né', 'ta', 'tá', 'então', 'hum', 'ahn', 'aham', 'daí', 'aí'
]);

// Normalize word for phonetic/text comparison (removes accents, punctuation, lowercases)
export function normalizeWord(word: string): string {
  if (!word) return '';
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics/accents for robust matching
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»]/g, '')
    .trim();
}

/**
 * Strips adjacent duplicate words, filler stutters, and repeated multi-word phrases (2 to 8 words)
 * while preserving appropriate capitalization and punctuation.
 *
 * Examples:
 * - "o o professor" -> "o professor"
 * - "bom dia dia a todos" -> "bom dia a todos"
 * - "vamos começar vamos começar a aula" -> "vamos começar a aula"
 * - "para para a escola" -> "para a escola"
 * - "é é então então vamos" -> "é então vamos"
 * - "aula na sala de aula na sala de aula" -> "aula na sala de aula"
 */
export function cleanRepeatedWords(
  text: string,
  strictMode: boolean = true
): { cleaned: string; removedCount: number } {
  if (!text || text.trim().length === 0) {
    return { cleaned: '', removedCount: 0 };
  }

  // Normalize excessive spaces and clean punctuation spacing
  let normalized = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:])\1+/g, '$1') // remove duplicated punctuation (e.g. "..", ",,")
    .trim();

  let tokens = normalized.split(' ');
  if (tokens.length <= 1) {
    return { cleaned: normalized, removedCount: 0 };
  }

  let totalRemoved = 0;

  // Pass 1: Remove repeated multi-word phrases (phrases of length 8 down to 2)
  const maxPhraseLen = Math.min(8, Math.floor(tokens.length / 2));
  for (let phraseLen = maxPhraseLen; phraseLen >= 2; phraseLen--) {
    let i = 0;
    while (i + phraseLen * 2 <= tokens.length) {
      const phrase1 = tokens.slice(i, i + phraseLen);
      const phrase2 = tokens.slice(i + phraseLen, i + phraseLen * 2);

      const norm1 = phrase1.map(normalizeWord).join(' ');
      const norm2 = phrase2.map(normalizeWord).join(' ');

      if (norm1.length > 0 && norm1 === norm2) {
        // Remove the duplicate second phrase
        tokens.splice(i + phraseLen, phraseLen);
        totalRemoved += phraseLen;
        // Keep index i to re-check in case phrase repeated 3+ times
      } else {
        i++;
      }
    }
  }

  // Pass 2: Remove consecutive duplicate single words (e.g. "vamos vamos", "o o", "que que")
  const dedupedTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const currentToken = tokens[i];
    const prevToken = dedupedTokens[dedupedTokens.length - 1];

    if (!prevToken) {
      dedupedTokens.push(currentToken);
      continue;
    }

    const normCurrent = normalizeWord(currentToken);
    const normPrev = normalizeWord(prevToken);

    // If both normalize to non-empty identical words, skip the duplicate
    if (normCurrent.length > 0 && normCurrent === normPrev) {
      totalRemoved++;
      // If the duplicate has trailing punctuation that the original didn't, preserve it
      const trailingPunct = currentToken.match(/[.,!?;:]+$/);
      if (trailingPunct && !prevToken.match(/[.,!?;:]+$/)) {
        dedupedTokens[dedupedTokens.length - 1] = prevToken + trailingPunct[0];
      }
      continue;
    }

    // Pass 2b: Remove filler words separated repeats (e.g. "o é o", "vamos tipo vamos")
    if (strictMode && dedupedTokens.length >= 2) {
      const secondPrevToken = dedupedTokens[dedupedTokens.length - 2];
      const normSecondPrev = normalizeWord(secondPrevToken);
      const isPrevFiller = COMMON_FILLERS.has(normPrev);

      if (isPrevFiller && normCurrent.length > 0 && normCurrent === normSecondPrev) {
        // Drop the redundant filler and repeated word
        dedupedTokens.pop(); // drop filler
        totalRemoved += 2;
        continue;
      }
    }

    dedupedTokens.push(currentToken);
  }

  // Pass 3: Polish capitalization and sentence beginnings
  const cleanedText = polishSentences(dedupedTokens.join(' '));

  return { cleaned: cleanedText, removedCount: totalRemoved };
}

/**
 * Polishes punctuation and capitalizes the first letter of sentences
 * to make captions extremely legible and easy for deaf students to read.
 */
export function polishSentences(text: string): string {
  if (!text) return '';

  return text
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    // Capitalize start of text
    .replace(/^([a-zà-ÿ])/i, (match) => match.toUpperCase())
    // Capitalize after periods, exclamation, or question marks
    .replace(/([.!?]\s+)([a-zà-ÿ])/g, (_, punct, letter) => punct + letter.toUpperCase())
    .trim();
}

/**
 * Merges previous transcript with a newly arrived finalized text chunk,
 * detecting and removing any boundary/seam overlap between the tail of existingText
 * and the head of newChunk.
 *
 * Also checks if the entire new chunk is already present at the end of existingText
 * (common Web Speech API repetition bug).
 */
export function mergeTranscriptWithOverlap(
  existingText: string,
  newChunk: string,
  antiRepeatEnabled: boolean = true,
  strictMode: boolean = true
): { merged: string; removedOverlapCount: number } {
  const trimmedNew = newChunk.trim();
  if (!trimmedNew) {
    return { merged: existingText, removedOverlapCount: 0 };
  }

  if (!existingText || !existingText.trim()) {
    if (antiRepeatEnabled) {
      const { cleaned, removedCount } = cleanRepeatedWords(trimmedNew, strictMode);
      return { merged: cleaned, removedOverlapCount: removedCount };
    }
    return { merged: trimmedNew, removedOverlapCount: 0 };
  }

  const existingTokens = existingText.trim().split(/\s+/);
  const newTokens = trimmedNew.split(/\s+/);

  // Check 1: Is newChunk completely contained within the tail of existingText?
  const existingNormTail = existingTokens
    .slice(-Math.min(existingTokens.length, newTokens.length * 2 + 4))
    .map(normalizeWord)
    .join(' ');
  const newNormAll = newTokens.map(normalizeWord).join(' ');

  if (newNormAll.length > 3 && existingNormTail.endsWith(newNormAll)) {
    // Exactly duplicate repetition chunk from browser! Drop it completely.
    return {
      merged: existingText.trim(),
      removedOverlapCount: newTokens.length
    };
  }

  // Check 2: Find maximum matching overlap between tail of existing and head of new (up to 16 words)
  const maxCheck = Math.min(existingTokens.length, newTokens.length, 16);
  let overlapWordsCount = 0;

  for (let k = maxCheck; k >= 1; k--) {
    const tailSlice = existingTokens.slice(existingTokens.length - k);
    const headSlice = newTokens.slice(0, k);

    const tailNorm = tailSlice.map(normalizeWord).join(' ');
    const headNorm = headSlice.map(normalizeWord).join(' ');

    if (tailNorm.length > 0 && tailNorm === headNorm) {
      overlapWordsCount = k;
      break;
    }
  }

  // Check 3: If no exact head-to-tail match, check if first 2-4 words of newChunk appear anywhere in the last 6 words of existing
  if (overlapWordsCount === 0 && newTokens.length >= 2 && existingTokens.length >= 2) {
    const searchSlice = existingTokens.slice(-6).map(normalizeWord);
    const candidateLen = Math.min(newTokens.length, 3);
    const candidateWords = newTokens.slice(0, candidateLen).map(normalizeWord).join(' ');

    for (let idx = 0; idx <= searchSlice.length - candidateLen; idx++) {
      const sliceWords = searchSlice.slice(idx, idx + candidateLen).join(' ');
      if (sliceWords === candidateWords) {
        // Found matching subsequence!
        const wordsFromEnd = searchSlice.length - idx;
        overlapWordsCount = Math.min(wordsFromEnd, newTokens.length);
        break;
      }
    }
  }

  let tokensToAdd = newTokens;
  if (overlapWordsCount > 0) {
    tokensToAdd = newTokens.slice(overlapWordsCount);
  }

  let rawMerged = existingText.trim();
  if (tokensToAdd.length > 0) {
    rawMerged += ' ' + tokensToAdd.join(' ');
  }

  if (antiRepeatEnabled) {
    const { cleaned, removedCount } = cleanRepeatedWords(rawMerged, strictMode);
    return {
      merged: cleaned,
      removedOverlapCount: overlapWordsCount + removedCount
    };
  }

  return {
    merged: rawMerged,
    removedOverlapCount: overlapWordsCount
  };
}

/**
 * Strips overlapping prefix words from interim transcript so that the display
 * never flickers duplicate words at the boundary between finalized and interim text.
 */
export function sanitizeInterimTranscript(
  finalText: string,
  interimText: string,
  antiRepeatEnabled: boolean = true
): string {
  const trimmedInterim = interimText.trim();
  if (!trimmedInterim) return '';
  if (!finalText || !finalText.trim()) {
    if (antiRepeatEnabled) {
      return cleanRepeatedWords(trimmedInterim, true).cleaned;
    }
    return trimmedInterim;
  }

  const finalTokens = finalText.trim().split(/\s+/);
  const interimTokens = trimmedInterim.split(/\s+/);

  // If the entire interim text is already present in the tail of finalized text, hide it completely!
  const finalTailNorm = finalTokens.slice(-Math.min(finalTokens.length, interimTokens.length + 4)).map(normalizeWord).join(' ');
  const interimAllNorm = interimTokens.map(normalizeWord).join(' ');
  if (finalTailNorm.endsWith(interimAllNorm)) {
    return '';
  }

  // Check overlap of up to 10 words between tail of final and head of interim
  const maxCheck = Math.min(finalTokens.length, interimTokens.length, 10);
  let overlapWordsCount = 0;

  for (let k = maxCheck; k >= 1; k--) {
    const tailSlice = finalTokens.slice(finalTokens.length - k);
    const headSlice = interimTokens.slice(0, k);

    const tailNorm = tailSlice.map(normalizeWord).join(' ');
    const headNorm = headSlice.map(normalizeWord).join(' ');

    if (tailNorm.length > 0 && tailNorm === headNorm) {
      overlapWordsCount = k;
      break;
    }
  }

  let effectiveInterimTokens = interimTokens;
  if (overlapWordsCount > 0) {
    effectiveInterimTokens = interimTokens.slice(overlapWordsCount);
  }

  const resultInterim = effectiveInterimTokens.join(' ').trim();
  if (!resultInterim) return '';

  if (antiRepeatEnabled) {
    return cleanRepeatedWords(resultInterim, true).cleaned;
  }

  return resultInterim;
}
