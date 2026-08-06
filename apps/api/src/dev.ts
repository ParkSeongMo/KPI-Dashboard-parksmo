/**
 * 로컬 실행 진입점. Vercel 배포에는 쓰이지 않는다(그쪽은 src/index.ts 기본 export).
 */

import { serve } from '@hono/node-server'
import app from './index'

const port = Number(process.env.API_PORT ?? 4000)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] http://localhost:${info.port}`)
})
