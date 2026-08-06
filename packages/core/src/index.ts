/**
 * @kpi/core — 프론트엔드와 백엔드가 함께 쓰는 순수 코드.
 *
 * 이 패키지에는 DB·React·HTTP 의존이 없다. 그래야 양쪽이 안전하게 import한다.
 * 근거: docs/design-reviews/frontend-backend-split.md
 */

export * from './calc'
export * from './constants'
export * from './format'
export * from './schema'
export * from './year-options'
