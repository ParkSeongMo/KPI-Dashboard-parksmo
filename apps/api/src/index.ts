/**
 * KPI 백엔드 — Hono.
 *
 * `export default app` 형태여야 Vercel이 무설정으로 배포한다
 * (프로젝트 루트나 src/ 의 index/app/server 기본 export를 찾는다).
 * 로컬 실행은 src/dev.ts 가 담당한다.
 */

import './env.js'
import { Hono } from 'hono'
import { requireApiKey } from './auth.js'
import { kpiRoutes } from './routes/kpi.js'

const app = new Hono()

/** 헬스체크 — 인증 없이 열어 둔다. */
app.get('/health', (c) => c.json({ ok: true }))

app.use('/api/*', requireApiKey)
app.route('/api/kpi-evaluations', kpiRoutes)

app.onError((error, c) => {
  // 예기치 못한 오류는 상세를 밖으로 내보내지 않는다
  console.error(error)
  return c.json({ error: { code: 'INTERNAL', message: '서버 오류가 발생했습니다' } }, 500)
})

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: '경로를 찾을 수 없습니다' } }, 404))

export default app
