import 'server-only'

/**
 * 백엔드 호출 전담 (BFF).
 *
 * **브라우저에서 실행되지 않는다.** `server-only`가 클라이언트 컴포넌트에서 import되면
 * 빌드를 실패시킨다. API 키가 번들에 섞이는 사고를 컴파일 단계에서 막는다.
 *
 * HTTP 상태 → ③의 ActionError 코드 변환을 여기 한 곳에서 한다.
 * 화면 코드는 ③에서 정한 반환 타입을 그대로 본다.
 *
 * 근거: docs/design-reviews/frontend-backend-split.md
 */

import {
  API_KEY_HEADER,
  type ApiErrorBody,
  type BasePeriodOption,
  type KpiEvaluationDetail,
  type KpiListQuery,
  type KpiListResult,
} from '@kpi/core/contract'

const BASE_URL = process.env.KPI_API_URL ?? 'http://localhost:4000'

export type ApiFailure = ApiErrorBody['error']

/** 백엔드가 코드와 함께 거절한 응답. 예기치 못한 오류는 이것이 아니라 throw다. */
export class ApiError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(failure.message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.KPI_API_KEY
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { [API_KEY_HEADER]: apiKey } : {}),
      ...init?.headers,
    },
    // 조회 결과를 캐시하지 않는다. 변경 후 곧바로 반영되어야 한다.
    cache: 'no-store',
  })

  if (response.ok) return (await response.json()) as T

  let body: ApiErrorBody | undefined
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = undefined
  }
  if (body?.error) throw new ApiError(body.error)

  // 계약에 없는 실패(500, 네트워크 등)는 그대로 던져 error boundary가 받게 한다
  throw new Error(`API 요청 실패: ${response.status} ${path}`)
}

function toSearchParams(query: KpiListQuery): string {
  const params = new URLSearchParams()
  if (query.departmentName) params.set('department', query.departmentName)
  if (query.teamName) params.set('team', query.teamName)
  if (query.employeeName) params.set('name', query.employeeName)
  if (query.position) params.set('position', query.position)
  if (query.baseYear && query.baseHalf) params.set('period', `${query.baseYear}-${query.baseHalf}`)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  return params.size > 0 ? `?${params}` : ''
}

export function listKpiEvaluations(query: KpiListQuery = {}): Promise<KpiListResult> {
  return request<KpiListResult>(`/api/kpi-evaluations${toSearchParams(query)}`)
}

/** 없거나 삭제된 대상은 예외 대신 null을 돌려준다. 화면이 404를 낸다. */
export async function getKpiEvaluation(id: string): Promise<KpiEvaluationDetail | null> {
  try {
    return await request<KpiEvaluationDetail>(`/api/kpi-evaluations/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.failure.code === 'NOT_FOUND') return null
    throw error
  }
}

export function listBasePeriods(): Promise<BasePeriodOption[]> {
  return request<BasePeriodOption[]>('/api/kpi-evaluations/meta/base-periods')
}

export function listEvaluationAreas(): Promise<string[]> {
  return request<string[]>('/api/kpi-evaluations/meta/evaluation-areas')
}

export function createKpiEvaluation(input: unknown): Promise<{ id: string }> {
  return request<{ id: string }>('/api/kpi-evaluations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateKpiEvaluation(id: string, input: unknown): Promise<{ id: string }> {
  return request<{ id: string }>(`/api/kpi-evaluations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteKpiEvaluation(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/api/kpi-evaluations/${id}`, { method: 'DELETE' })
}
