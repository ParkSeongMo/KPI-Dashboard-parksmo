/**
 * 서비스 간 인증 미들웨어.
 *
 * **사용자 인증이 아니다.** ⑤에서 데모 전제로 사용자 로그인을 만들지 않기로 했고,
 * 그 결정은 유지된다. 이것은 분리로 새로 생긴 표면(공개 인터넷의 백엔드)을 막는 장치다.
 *
 * apps/web 의 서버 계층만 이 키를 갖는다. 브라우저에는 내려가지 않는다(BFF 구조).
 * 근거: docs/design-reviews/frontend-backend-split.md
 */

import { API_KEY_HEADER, ERROR_STATUS, type ApiErrorBody } from '@kpi/core/contract'
import type { MiddlewareHandler } from 'hono'

export const requireApiKey: MiddlewareHandler = async (c, next) => {
  const expected = process.env.API_KEY
  // 키가 설정되지 않은 환경(로컬 등)에서는 통과시킨다. 배포 환경에는 반드시 설정한다.
  if (!expected) return next()

  if (c.req.header(API_KEY_HEADER) !== expected) {
    const body: ApiErrorBody = {
      error: { code: 'UNAUTHORIZED', message: 'API 키가 없거나 올바르지 않습니다' },
    }
    return c.json(body, ERROR_STATUS.UNAUTHORIZED)
  }
  return next()
}
