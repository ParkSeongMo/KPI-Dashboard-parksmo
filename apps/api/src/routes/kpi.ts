/**
 * KPI REST 라우트.
 *
 * 얇게 유지한다: 파싱 → service 호출 → 응답. 도메인 규칙을 여기 넣지 않는다.
 * (③에서 Server Action에 적용하던 규칙을 HTTP 계층으로 옮긴 것이다.)
 *
 * 근거: docs/design-reviews/frontend-backend-split.md 「API 계약」
 */

import { KpiEvaluationInput, type BaseHalfValue } from '@kpi/core'
import { ERROR_STATUS, type ApiErrorBody } from '@kpi/core/contract'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  DuplicatePeriodError,
  NotFoundError,
  createKpiEvaluation,
  deleteKpiEvaluation,
  getKpiEvaluation,
  listBasePeriods,
  listEvaluationAreas,
  listKpiEvaluations,
  updateKpiEvaluation,
} from '../service'

export const kpiRoutes = new Hono()

function errorBody(
  code: ApiErrorBody['error']['code'],
  message: string,
  extra?: Pick<ApiErrorBody['error'], 'fieldErrors' | 'formErrors'>,
): ApiErrorBody {
  return { error: { code, message, ...extra } }
}

function validationBody(error: z.ZodError): ApiErrorBody {
  const flat = z.flattenError(error)
  const fieldErrors: Record<string, string[]> = {}
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    fieldErrors[key] = Array.isArray(messages) ? (messages as string[]) : []
  }
  return errorBody('VALIDATION', '입력을 확인해주세요', {
    fieldErrors,
    formErrors: flat.formErrors,
  })
}

/** `2026-SECOND` 한 덩어리로 주고받는다. 파싱 실패 시 조건에서 무시한다. */
function parsePeriod(value: string | undefined) {
  if (!value) return {}
  const match = /^(\d{4})-(FIRST|SECOND)$/.exec(value)
  if (!match) return {}
  return { baseYear: Number(match[1]), baseHalf: match[2] as BaseHalfValue }
}

kpiRoutes.get('/', async (c) => {
  const q = c.req.query()
  const page = Number(q.page ?? '1')
  const result = await listKpiEvaluations({
    departmentName: q.department,
    teamName: q.team,
    employeeName: q.name,
    position: q.position,
    ...parsePeriod(q.period),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  })
  return c.json(result)
})

kpiRoutes.get('/meta/base-periods', async (c) => c.json(await listBasePeriods()))

kpiRoutes.get('/meta/evaluation-areas', async (c) => c.json(await listEvaluationAreas()))

kpiRoutes.get('/:id', async (c) => {
  const evaluation = await getKpiEvaluation(c.req.param('id'))
  if (!evaluation) {
    return c.json(errorBody('NOT_FOUND', '대상 KPI를 찾을 수 없습니다'), ERROR_STATUS.NOT_FOUND)
  }
  return c.json(evaluation)
})

kpiRoutes.post('/', async (c) => {
  const parsed = KpiEvaluationInput.safeParse(await c.req.json())
  if (!parsed.success) return c.json(validationBody(parsed.error), ERROR_STATUS.VALIDATION)

  try {
    const id = await createKpiEvaluation(parsed.data)
    return c.json({ id }, 201)
  } catch (error) {
    if (error instanceof DuplicatePeriodError) {
      return c.json(errorBody('DUPLICATE_PERIOD', error.message), ERROR_STATUS.DUPLICATE_PERIOD)
    }
    throw error
  }
})

kpiRoutes.put('/:id', async (c) => {
  const parsed = KpiEvaluationInput.safeParse(await c.req.json())
  if (!parsed.success) return c.json(validationBody(parsed.error), ERROR_STATUS.VALIDATION)

  const id = c.req.param('id')
  try {
    await updateKpiEvaluation(id, parsed.data)
    return c.json({ id })
  } catch (error) {
    if (error instanceof DuplicatePeriodError) {
      return c.json(errorBody('DUPLICATE_PERIOD', error.message), ERROR_STATUS.DUPLICATE_PERIOD)
    }
    if (error instanceof NotFoundError) {
      return c.json(errorBody('NOT_FOUND', error.message), ERROR_STATUS.NOT_FOUND)
    }
    throw error
  }
})

kpiRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  try {
    await deleteKpiEvaluation(id)
    return c.json({ id })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json(errorBody('NOT_FOUND', error.message), ERROR_STATUS.NOT_FOUND)
    }
    throw error
  }
})
