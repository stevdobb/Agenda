import * as chrono from 'chrono-node';

// Create a custom Chrono instance based on the casual configuration
const customChrono = chrono.casual.clone();

// Add a custom parser for HHMM and HMM format (e.g., 1430, 930)
customChrono.parsers.push({
  pattern: () => {
    // This regex looks for a 3 or 4 digit number that isn't part of a larger number,
    // and which is likely a time.
    // \b matches a word boundary.
    // (\d{3,4}) captures 3 or 4 digits.
    return /\b(\d{3,4})\b/i;
  },
  extract: (_context, match) => {
    const timeStr = match[1];
    let hour: number;
    let minute: number;

    if (timeStr.length === 3) { // HMM format, e.g., "930" -> 9:30
      hour = parseInt(timeStr.substring(0, 1), 10);
      minute = parseInt(timeStr.substring(1, 3), 10);
    } else { // HHMM format, e.g., "1430" -> 14:30
      hour = parseInt(timeStr.substring(0, 2), 10);
      minute = parseInt(timeStr.substring(2, 4), 10);
    }

    // Basic validation
    if (minute >= 60 || hour > 23) {
      return null;
    }

    return { hour, minute };
  },
});

export default customChrono;
