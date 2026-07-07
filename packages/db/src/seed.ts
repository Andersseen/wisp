import { hash } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import { createDbClient } from './client'
import { users } from './schema'

// Demo credentials — surfaced in the seed output so they can be used to log in.
const DEMO_EMAIL = 'demo@wisp.sh'
const DEMO_PASSWORD = 'demo1234'

async function seed() {
  const db = createDbClient()

  const hashedPassword = await hash(DEMO_PASSWORD)

  // Idempotent: replace any existing demo user so re-seeding always yields a
  // fresh, known-good argon2 hash (the old fake 'seed-only' hash never verified).
  await db.delete(users).where(eq(users.email, DEMO_EMAIL))

  await db.insert(users).values({
    id: 'seed_demo',
    email: DEMO_EMAIL,
    hashedPassword,
    name: 'Demo User',
    role: 'admin',
  })

  // Seed scripts are CLI utilities; using stdout for user feedback
  process.stdout.write(`Seeded database\n  demo login → ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`)
}

seed().catch((err: unknown) => {
  process.stderr.write(`Seed failed: ${String(err)}\n`)
  process.exit(1)
})
