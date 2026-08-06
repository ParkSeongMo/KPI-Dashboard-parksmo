import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// .env는 저장소 루트에 하나만 둔다(apps/api/src/env.ts와 같은 규칙)
const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env')
if (existsSync(rootEnv)) loadEnv({ path: rootEnv })

/**
 * Prisma 7 설정.
 *
 * datasource.url 은 **Migrate가 쓰는 연결**이므로 direct 엔드포인트를 넣는다.
 * pooled(-pooler) URL로 마이그레이션을 돌리면 실패한다.
 * 런타임 쿼리는 이 파일을 쓰지 않는다. src/db.ts 가 Neon 어댑터에 pooled URL을 넘긴다.
 *
 * 근거: docs/design-reviews/stack-and-structure.md
 */
type Env = { DIRECT_URL: string }

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env<Env>('DIRECT_URL') },
})
