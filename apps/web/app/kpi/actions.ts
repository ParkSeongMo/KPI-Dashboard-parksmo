'use server'

/**
 * KPI Server Actions.
 *
 * 분리 이후에도 **③에서 정한 반환 타입을 그대로 유지한다.** 화면 코드는 바뀌지 않는다.
 * 달라진 것은 안쪽뿐이다: Prisma 직접 호출 → 백엔드 HTTP 호출.
 *
 * 얇게 유지한다: zod 파싱 → API 호출 → revalidate. 도메인 규칙을 여기 넣지 않는다.
 * 검증 실패는 반환값, 예기치 못한 오류는 throw다(③).
 *
 * 근거: docs/design-reviews/frontend-backend-split.md
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { KpiEvaluationInput } from '@kpi/core'
import {
  ApiError,
  createKpiEvaluation as createRemote,
  deleteKpiEvaluation as deleteRemote,
  updateKpiEvaluation as updateRemote,
} from '@/lib/api-client'

export type ActionError =
  | { code: 'VALIDATION'; fieldErrors: Record<string, string[]>; formErrors: string[] }
  | { code: 'DUPLICATE_PERIOD'; message: string }
  | { code: 'NOT_FOUND'; message: string }

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError }

function validationError(error: z.ZodError): ActionError {
  const flat = z.flattenError(error)
  const fieldErrors: Record<string, string[]> = {}
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    fieldErrors[key] = Array.isArray(messages) ? (messages as string[]) : []
  }
  return { code: 'VALIDATION', fieldErrors, formErrors: flat.formErrors }
}

/**
 * 백엔드가 코드와 함께 거절한 응답을 화면이 다룰 형태로 바꾼다.
 * 그 외(500, 네트워크)는 다시 던져 error boundary가 받게 한다.
 */
function toActionError(error: unknown): ActionError {
  if (error instanceof ApiError) {
    const { code, message, fieldErrors, formErrors } = error.failure
    if (code === 'VALIDATION') {
      return { code: 'VALIDATION', fieldErrors: fieldErrors ?? {}, formErrors: formErrors ?? [] }
    }
    if (code === 'DUPLICATE_PERIOD') return { code: 'DUPLICATE_PERIOD', message }
    if (code === 'NOT_FOUND') return { code: 'NOT_FOUND', message }
  }
  throw error
}

function revalidateAll(id?: string) {
  revalidatePath('/kpi')
  if (id) revalidatePath(`/kpi/${id}`)
}

export async function createKpiEvaluationAction(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  // 백엔드도 같은 스키마로 재검증한다. 여기서 먼저 걸러 왕복을 줄인다.
  const parsed = KpiEvaluationInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) }

  try {
    const { id } = await createRemote(parsed.data)
    revalidateAll(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return { ok: false, error: toActionError(error) }
  }
}

export async function updateKpiEvaluationAction(
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = KpiEvaluationInput.safeParse(raw)
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) }

  try {
    await updateRemote(id, parsed.data)
    revalidateAll(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return { ok: false, error: toActionError(error) }
  }
}

export async function deleteKpiEvaluationAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await deleteRemote(id)
    revalidateAll(id)
    return { ok: true, data: { id } }
  } catch (error) {
    return { ok: false, error: toActionError(error) }
  }
}
