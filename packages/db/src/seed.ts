import { createDbClient } from './client'
import { users } from './schema'

async function seed() {
  const db = createDbClient()

  await db.insert(users).values({
    id: 'seed_admin',
    email: 'admin@wisp.sh',
    hashedPassword: 'seed-only',
    name: 'Admin',
    role: 'admin',
  })

  // Seed scripts are CLI utilities; using stdout for user feedback
  process.stdout.write('Seeded database\n')
}

seed().catch((err: unknown) => {
  process.stderr.write(`Seed failed: ${String(err)}\n`)
  process.exit(1)
})
