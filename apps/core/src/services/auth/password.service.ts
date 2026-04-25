import { hash, verify } from '@node-rs/argon2'

export class PasswordService {
  async hash(password: string): Promise<string> {
    return hash(password)
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return verify(hash, password)
  }
}
