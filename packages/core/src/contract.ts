/**
 * API 계약 타입 — 백엔드가 내려주고 프론트엔드가 받는 모양.
 *
 * 양쪽이 같은 파일을 보므로 응답 형태가 갈릴 수 없다.
 * 근거: docs/design-reviews/frontend-backend-split.md 「API 계약」
 */

import type { BaseHalfValue } from './constants.js'

export type KpiListQuery = {
  departmentName?: string
  teamName?: string
  employeeName?: string
  position?: string
  baseYear?: number
  baseHalf?: BaseHalfValue
  page?: number
}

export type KpiListRow = {
  id: string
  employeeName: string
  departmentName: string
  teamName: string | null
  position: string
  baseYear: number
  baseHalf: BaseHalfValue
  /** 반올림하지 않은 값. 표시 반올림은 format.ts에서만 한다. */
  totalAchievementRate: number
}

export type KpiListResult = {
  rows: KpiListRow[]
  totalCount: number
  page: number
  pageSize: number
}

export type KpiItemDetail = {
  id: string
  evaluationArea: string
  itemName: string
  metric: string | null
  targetValue: string | null
  targetCount: number
  achievedCount: number
  weight: number
  sortOrder: number
}

export type KpiEvaluationDetail = {
  id: string
  employeeLoginId: string
  employeeName: string
  departmentName: string
  teamName: string | null
  position: string
  baseYear: number
  baseHalf: BaseHalfValue
  items: KpiItemDetail[]
}

export type BasePeriodOption = { baseYear: number; baseHalf: BaseHalfValue }

/** 에러 코드. HTTP 상태와 1:1로 대응한다. */
export type ApiErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'DUPLICATE_PERIOD'

export const ERROR_STATUS: Record<ApiErrorCode, 400 | 401 | 404 | 409> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  DUPLICATE_PERIOD: 409,
}

/** 모든 실패 응답이 쓰는 하나의 본문 모양. */
export type ApiErrorBody = {
  error: {
    code: ApiErrorCode
    message: string
    fieldErrors?: Record<string, string[]>
    formErrors?: string[]
  }
}

/** 서비스 간 인증 헤더 이름. 사용자 인증이 아니다. */
export const API_KEY_HEADER = 'x-api-key'
