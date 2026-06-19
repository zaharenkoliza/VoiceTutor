/**
 * Answer verification service.
 * Compares program output (last non-empty line) against the expected answer.
 * EGE answers are always a single value — number or short string.
 */

export interface VerificationResult {
  isCorrect: boolean;
  expected: string;
  actual: string;
  attempt: number;
}

/**
 * Extract the answer from program output.
 * Takes the last non-empty line (trimmed) — this is the standard for EGE tasks
 * where the program prints the answer as its final output.
 */
function extractAnswer(output: string): string {
  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines[lines.length - 1] ?? '';
}

/**
 * Normalize a string for comparison: trim whitespace, collapse multiple spaces.
 */
function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Verify program output against expected answer.
 * Comparison is case-insensitive and whitespace-normalized.
 */
export function verifyAnswer(
  programOutput: string,
  expectedAnswer: string,
): boolean {
  const actual = normalize(extractAnswer(programOutput));
  const expected = normalize(expectedAnswer);

  if (actual === expected) return true;

  // Try numeric comparison (handles "099" vs "99", "3.00" vs "3.0", etc.)
  const actualNum = Number(actual);
  const expectedNum = Number(expected);
  if (!isNaN(actualNum) && !isNaN(expectedNum)) {
    // For floats: compare with small epsilon
    if (Math.abs(actualNum - expectedNum) < 1e-9) return true;
  }

  // Case-insensitive string match
  if (actual.toLowerCase() === expected.toLowerCase()) return true;

  return false;
}
