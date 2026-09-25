import bcrypt from 'bcryptjs';

// ✅ Best Practice: this is the only file in the codebase that imports
// bcryptjs — every other layer just calls hash()/verify().
export async function hashPassword(plainText: string, saltRounds: number): Promise<string> {
  return bcrypt.hash(plainText, saltRounds);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
