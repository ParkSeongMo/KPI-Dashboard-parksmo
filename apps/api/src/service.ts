/**
 * KPI 데이터 접근 계층.
 *
 * app/ 에서 Prisma를 직접 부르지 않는다. 반드시 이 파일을 거친다.
 * Prisma의 Decimal·에러 코드가 이 경계를 넘어가지 않게 한다.
 *
 * 근거: docs/design-reviews/server-action-contract.md
 */

import { Prisma } from '@prisma/client'
import { prisma } from './db.js'
import {
  ALIVE,
  PAGE_SIZE,
  totalAchievementRate,
  type CalcItem,
  type KpiEvaluationInputType,
} from '@kpi/core'
import type {
  BasePeriodOption,
  KpiEvaluationDetail,
  KpiListQuery,
  KpiListResult,
} from '@kpi/core/contract'

/**
 * 살아 있는 행만 고르는 공통 조건.
 *
 * sentinel 방식이라 `deletedAt: null`이 아니다. 모든 조회가 이것만 쓴다.
 * 개별 쿼리에서 조건을 직접 쓰면 빠뜨렸을 때 삭제한 행이 되살아난다.
 */
const aliveOnly = { deletedAt: ALIVE } as const

/**
 * 조회 결과 타입은 `@kpi/core/contract`에 있다.
 * 프론트엔드가 같은 파일을 보므로 응답 모양이 갈릴 수 없다.
 */

/** Prisma Decimal → number. 이 경계에서만 변환한다(응답에 Decimal을 흘리지 않는다). */
function toNumber(value: Prisma.Decimal): number {
  return value.toNumber()
}

/** 빈 문자열과 미지정을 같게 본다. */
function contains(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? { contains: trimmed, mode: 'insensitive' as const } : undefined
}

function buildWhere(query: KpiListQuery): Prisma.KpiEvaluationWhereInput {
  return {
    ...aliveOnly,
    departmentName: contains(query.departmentName),
    teamName: contains(query.teamName),
    employeeName: contains(query.employeeName),
    position: query.position?.trim() ? query.position.trim() : undefined,
    baseYear: query.baseYear,
    baseHalf: query.baseHalf,
  }
}

/**
 * 목록 조회.
 *
 * 정렬은 기준기간 내림차순 → 부서명 → 팀(빈 값 마지막) → 이름 가나다순이다.
 * 시안 10행의 순서를 역산해 확정한 값이다(screen-behavior.md).
 *
 * 종합 달성률은 저장하지 않는 파생값이라 항목을 함께 가져와 계산한다.
 * 페이지당 10건이므로 include로 한 번에 읽는다.
 */
export async function listKpiEvaluations(query: KpiListQuery = {}): Promise<KpiListResult> {
  const page = Math.max(1, query.page ?? 1)
  const where = buildWhere(query)

  const [totalCount, records] = await Promise.all([
    prisma.kpiEvaluation.count({ where }),
    prisma.kpiEvaluation.findMany({
      where,
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [
        { baseYear: 'desc' },
        { baseHalf: 'desc' },
        { departmentName: 'asc' },
        // 팀이 빈 값인 행은 그룹 마지막으로 보낸다
        { teamName: { sort: 'asc', nulls: 'last' } },
        { employeeName: 'asc' },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return {
    rows: records.map((record) => ({
      id: record.id,
      employeeName: record.employeeName,
      departmentName: record.departmentName,
      teamName: record.teamName,
      position: record.position,
      baseYear: record.baseYear,
      baseHalf: record.baseHalf,
      totalAchievementRate: totalAchievementRate(
        record.items.map(
          (item): CalcItem => ({
            evaluationArea: item.evaluationArea,
            targetCount: item.targetCount,
            achievedCount: item.achievedCount,
            weight: toNumber(item.weight),
          }),
        ),
      ),
    })),
    totalCount,
    page,
    pageSize: PAGE_SIZE,
  }
}

/** 상세 조회. 삭제된 행은 돌려주지 않는다. */
export async function getKpiEvaluation(id: string): Promise<KpiEvaluationDetail | null> {
  const record = await prisma.kpiEvaluation.findFirst({
    where: { id, ...aliveOnly },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!record) return null

  return {
    id: record.id,
    employeeLoginId: record.employeeLoginId,
    employeeName: record.employeeName,
    departmentName: record.departmentName,
    teamName: record.teamName,
    position: record.position,
    baseYear: record.baseYear,
    baseHalf: record.baseHalf,
    items: record.items.map((item) => ({
      id: item.id,
      evaluationArea: item.evaluationArea,
      itemName: item.itemName,
      metric: item.metric,
      targetValue: item.targetValue,
      targetCount: item.targetCount,
      achievedCount: item.achievedCount,
      weight: toNumber(item.weight),
      sortOrder: item.sortOrder,
    })),
  }
}

/** 목록 셀렉트 옵션 — DB에 실제로 존재하는 기준 기간만 내려준다. */
export async function listBasePeriods(): Promise<BasePeriodOption[]> {
  const rows = await prisma.kpiEvaluation.findMany({
    where: aliveOnly,
    distinct: ['baseYear', 'baseHalf'],
    select: { baseYear: true, baseHalf: true },
    orderBy: [{ baseYear: 'desc' }, { baseHalf: 'desc' }],
  })
  return rows
}

/** 평가영역 자동완성 후보 — 기존에 쓰인 값만 모은다. */
export async function listEvaluationAreas(): Promise<string[]> {
  const rows = await prisma.kpiItem.findMany({
    where: { evaluation: aliveOnly },
    distinct: ['evaluationArea'],
    select: { evaluationArea: true },
    orderBy: { evaluationArea: 'asc' },
  })
  return rows.map((row) => row.evaluationArea)
}

/** service 계층이 app/에 노출하는 실패 종류. Prisma 코드를 그대로 흘리지 않는다. */
export class DuplicatePeriodError extends Error {
  constructor() {
    super('같은 사원의 같은 기준 기간 평가가 이미 있습니다')
    this.name = 'DuplicatePeriodError'
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('대상 KPI를 찾을 수 없습니다')
    this.name = 'NotFoundError'
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

/** 입력 배열 순서대로 sortOrder를 0부터 다시 부여한다. 클라이언트 값을 믿지 않는다. */
function itemCreateData(input: KpiEvaluationInputType) {
  return input.items.map((item, index) => ({
    evaluationArea: item.evaluationArea,
    itemName: item.itemName,
    metric: item.metric ?? null,
    targetValue: item.targetValue ?? null,
    targetCount: item.targetCount,
    achievedCount: item.achievedCount,
    weight: new Prisma.Decimal(item.weight),
    sortOrder: index,
  }))
}

export async function createKpiEvaluation(input: KpiEvaluationInputType): Promise<string> {
  try {
    const created = await prisma.kpiEvaluation.create({
      data: {
        employeeLoginId: input.employeeLoginId,
        employeeName: input.employeeName,
        departmentName: input.departmentName,
        teamName: input.teamName ?? null,
        position: input.position,
        baseYear: input.baseYear,
        baseHalf: input.baseHalf,
        items: { create: itemCreateData(input) },
      },
      select: { id: true },
    })
    return created.id
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicatePeriodError()
    throw error
  }
}

/**
 * 수정 — 항목은 전체 교체한다.
 *
 * 트랜잭션이 필수다. 기존 항목 삭제만 성공하고 삽입이 실패하면
 * 항목 없는 평가가 남는다.
 */
export async function updateKpiEvaluation(id: string, input: KpiEvaluationInputType): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.kpiEvaluation.findFirst({ where: { id, ...aliveOnly }, select: { id: true } })
      if (!target) throw new NotFoundError()

      await tx.kpiItem.deleteMany({ where: { evaluationId: id } })
      await tx.kpiEvaluation.update({
        where: { id },
        data: {
          employeeLoginId: input.employeeLoginId,
          employeeName: input.employeeName,
          departmentName: input.departmentName,
          teamName: input.teamName ?? null,
          position: input.position,
          baseYear: input.baseYear,
          baseHalf: input.baseHalf,
          items: { create: itemCreateData(input) },
        },
      })
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicatePeriodError()
    throw error
  }
}

/** 소프트 삭제 — sentinel을 삭제 시각으로 덮는다. 항목은 지우지 않는다. */
export async function deleteKpiEvaluation(id: string): Promise<void> {
  const result = await prisma.kpiEvaluation.updateMany({
    where: { id, ...aliveOnly },
    data: { deletedAt: new Date() },
  })
  if (result.count === 0) throw new NotFoundError()
}
