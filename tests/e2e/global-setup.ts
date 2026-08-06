/**
 * E2E 전역 준비 — 지난 실행이 남긴 테스트 데이터를 지운다.
 *
 * 테스트가 중간에 실패하면 정리 단계가 실행되지 않아 `e2e-*` 아이디의 행이 남는다.
 * 그 상태로 다음 실행을 하면 목록 순서·건수 검증이 잘못 깨진다.
 * 씨드 12건은 건드리지 않고 `e2e-` 접두사만 하드 삭제한다(항목은 cascade).
 */

import 'dotenv/config'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

export default async function globalSetup() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL이 없다. .env를 확인한다.')

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
  try {
    const result = await prisma.kpiEvaluation.deleteMany({
      where: { employeeLoginId: { startsWith: 'e2e-' } },
    })
    if (result.count > 0) {
      console.log(`[e2e] 지난 실행의 테스트 데이터 ${result.count}건을 정리했다.`)
    }
  } finally {
    await prisma.$disconnect()
  }
}
