/**
 * Prisma Client 싱글턴.
 *
 * 런타임 쿼리는 pooled DATABASE_URL을 Neon 어댑터에 넘겨 연결한다.
 * prisma.config.ts 의 DIRECT_URL은 Migrate 전용이므로 여기서 쓰지 않는다.
 *
 * Vercel 서버리스는 요청 간 상태를 보장하지 않지만 모듈은 재사용되므로,
 * 요청마다 새 클라이언트를 만들지 않고 모듈 스코프에 하나만 둔다.
 * 개발 중 HMR로 인스턴스가 쌓이는 것도 globalThis 캐시로 막는다.
 *
 * 근거: docs/design-reviews/stack-and-structure.md
 */

import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL이 없다. .env를 확인한다(pooled 엔드포인트여야 한다).')
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
