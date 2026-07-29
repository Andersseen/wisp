import { randomBytes } from 'node:crypto'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateId(length = 15): string {
  const bytes = randomBytes(length)
  let id = ''
  for (let i = 0; i < length; i++) {
    const byte = bytes[i]
    if (byte === undefined) {
      continue
    }

    id += ALPHABET[byte % ALPHABET.length]
  }
  return id
}
