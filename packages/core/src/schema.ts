/**
 * KPI 입력 검증 — zod 스키마 한 곳.
 *
 * 폼(클라이언트)과 Server Action(서버)이 같은 스키마를 쓴다.
 * 프론트 검증만 믿지 않고 Server Action이 반드시 이 스키마를 통과시킨다.
 *
 * 근거: docs/design-reviews/server-action-contract.md
 * zod v4 기준으로 작성했다(v3가 아니다).
 */

import { z } from 'zod'
import { WEIGHT_TOTAL_BASIS_POINTS } from './constants.js'
import { weightBasisPoints } from './calc.js'

/** 선택 문자열 — 빈 값과 미입력을 같게 본다. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

export const KpiItemInput = z.object({
  evaluationArea: z.string().trim().min(1, '평가영역은 필수입니다').max(50),
  itemName: z.string().trim().min(1, '항목은 필수입니다').max(100),
  metric: optionalText(100),
  /** 서술형 텍스트다. 계산에 쓰지 않는다. */
  targetValue: optionalText(100),
  /** 0을 허용한다. 0이면 목표 미설정으로 보고 달성률을 100%로 계산한다(calc.ts). */
  targetCount: z.number().int('정수여야 합니다').min(0, '목표개수는 0 이상이어야 합니다'),
  /** 목표개수 초과를 허용한다. 달성률만 calc에서 100%로 상한을 둔다. */
  achievedCount: z.number().int('정수여야 합니다').min(0, '달성개수는 0 이상이어야 합니다'),
  /** 소수 둘째 자리까지. 합 검증은 정수 환산으로 한다. */
  weight: z
    .number()
    .min(0.01, '가중치는 0보다 커야 합니다')
    .max(100, '가중치는 100을 넘을 수 없습니다')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, '가중치는 소수 둘째 자리까지 입력합니다'),
})

export type KpiItemInputType = z.infer<typeof KpiItemInput>

export const KpiEvaluationInput = z
  .object({
    employeeLoginId: z.string().trim().min(1, '아이디는 필수입니다').max(50),
    employeeName: z.string().trim().min(1, '이름은 필수입니다').max(50),
    departmentName: z.string().trim().min(1, '부서명은 필수입니다').max(50),
    /** 선택 필드 — 목록에 "-"로 표시된다. */
    teamName: optionalText(50),
    position: z.string().trim().min(1, '직책은 필수입니다').max(50),
    baseYear: z.number().int().min(2000).max(2100),
    baseHalf: z.enum(['FIRST', 'SECOND']),
    items: z.array(KpiItemInput).min(1, 'KPI 항목을 1개 이상 입력합니다'),
  })
  .superRefine((value, ctx) => {
    // 항목 개수를 먼저 검사했으므로, 여기서는 합계만 본다.
    // 항목이 0개면 위 min(1)이 이미 걸리므로 메시지를 중복해 띄우지 않는다.
    if (value.items.length === 0) return

    const basisPoints = weightBasisPoints(value.items)
    if (basisPoints !== WEIGHT_TOTAL_BASIS_POINTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: `저장하려면 가중치 합이 100%여야 합니다 (현재 ${basisPoints / 100}%)`,
      })
    }
  })

export type KpiEvaluationInputType = z.infer<typeof KpiEvaluationInput>
