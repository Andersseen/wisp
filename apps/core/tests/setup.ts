import { mock } from 'bun:test'

export function createMockDb() {
  return {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          get: mock(() => null),
          all: mock(() => []),
        })),
        all: mock(() => []),
      })),
    })),
    insert: mock(() => ({
      values: mock(() => Promise.resolve()),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => Promise.resolve()),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => Promise.resolve()),
    })),
  } as unknown as Parameters<typeof import('../src/services/auth/auth.service').AuthService>[0]
}

export function createMockValkey() {
  return {
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve('OK')),
    del: mock(() => Promise.resolve(1)),
    lpush: mock(() => Promise.resolve(1)),
    brpop: mock(() => Promise.resolve(null)),
  }
}

export function createMockDocker() {
  return {
    listContainers: mock(() => Promise.resolve([])),
    createContainer: mock(() => Promise.resolve({ start: mock(() => Promise.resolve()) })),
    pull: mock(() => Promise.resolve({})),
    modem: { followProgress: mock(() => undefined) },
  }
}
