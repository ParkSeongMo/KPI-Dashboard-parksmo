/**
 * KPI 계산 — 순수 함수만 둔다.
 *
 * 이 파일이 계산 규칙의 SSOT다. 서버 컴포넌트(목록·상세 렌더링), Server Action(저장 검증),
 * 클라이언트 폼(실시간 미리보기)이 **같은 파일을 import**한다. 중복 구현을 만들지 않는다.
 *
 * 규칙 (docs/design-reviews/kpi-domain-model.md):
 *   항목 달성률(%)   = min(achievedCount / targetCount × 100, 100)
 *   항목 가중점수     = 항목 달성률 × weight / 100
 *   종합 달성률(%)   = Σ(항목 가중점수)
 *   평가영역 비중(%) = Σ(해당 영역 항목의 weight)
 *
 * 반올림은 여기서 하지 않는다. 중간 반올림은 종합 달성률에 누적 오차를 만든다.
 * 표시 반올림은 lib/format.ts 한 곳에서만 한다.
 *
 * Prisma의 Decimal을 이 파일에 들이지 않는다. 입력은 number로 받는다.
 * Decimal → number 변환은 lib/kpi/service.ts 경계에서 한다(클라이언트 번들 오염 방지).
 */

import {
  GRADE_THRESHOLD,
  WEIGHT_TOTAL_BASIS_POINTS,
  type Grade,
} from './constants.js'

export type CalcItem = {
  evaluationArea: string
  targetCount: number
  achievedCount: number
  /** 백분율. 소수 둘째 자리까지. */
  weight: number
}

/**
 * 항목 달성률(%). 목표 초과 입력은 허용하되 100%로 상한을 둔다.
 *
 * **targetCount가 0이면 100%로 계산한다.** 목표를 세우지 않은 항목이므로
 * 달성한 것으로 본다. 0으로 나누기도 함께 피한다.
 */
export function itemAchievementRate(item: Pick<CalcItem, 'targetCount' | 'achievedCount'>): number {
  if (item.targetCount <= 0) return 100
  return Math.min((item.achievedCount / item.targetCount) * 100, 100)
}

/**
 * 상한에 걸렸는가 — 화면에 "목표 초과, 100%로 상한 적용"을 표시할지 판단한다.
 *
 * 목표개수가 0인 경우는 상한이 아니라 목표 미설정이므로 제외한다.
 */
export function isRateCapped(item: Pick<CalcItem, 'targetCount' | 'achievedCount'>): boolean {
  return item.targetCount > 0 && item.achievedCount > item.targetCount
}

/** 항목 가중점수 = 달성률 × 가중치 / 100 */
export function itemWeightedScore(item: CalcItem): number {
  return (itemAchievementRate(item) * item.weight) / 100
}

/** 종합 달성률(%) = 가중점수 합 */
export function totalAchievementRate(items: readonly CalcItem[]): number {
  return items.reduce((sum, item) => sum + itemWeightedScore(item), 0)
}

/**
 * 평가영역별 비중(%). 같은 이름을 **인접 여부와 무관하게 모두 합산**한다.
 *
 * 표의 rowspan 병합은 인접한 것만 묶는 표시 규칙이고, 이 합산은 계산 규칙이다.
 * 둘을 섞지 않는다(screen-behavior.md).
 *
 * 반환 순서는 항목에서 영역이 처음 등장한 순서를 따른다.
 */
export function areaWeightRatios(items: readonly CalcItem[]): { area: string; weight: number }[] {
  const order: string[] = []
  const totals = new Map<string, number>()
  for (const item of items) {
    if (!totals.has(item.evaluationArea)) order.push(item.evaluationArea)
    totals.set(item.evaluationArea, (totals.get(item.evaluationArea) ?? 0) + item.weight)
  }
  return order.map((area) => ({ area, weight: totals.get(area) ?? 0 }))
}

/**
 * 가중치 합을 정수 basis point로 환산한다.
 *
 * 부동소수로 더하면 33.33 × 3이 99.99000000000001이 되어 정상 입력이 거부된다.
 * 각 값을 × 100 해서 정수로 만든 뒤 더한다.
 */
export function weightBasisPoints(items: readonly Pick<CalcItem, 'weight'>[]): number {
  return items.reduce((sum, item) => sum + Math.round(item.weight * 100), 0)
}

/** 가중치 합이 정확히 100%인가. 저장 가능 여부의 기준이다. */
export function isWeightTotalValid(items: readonly Pick<CalcItem, 'weight'>[]): boolean {
  return weightBasisPoints(items) === WEIGHT_TOTAL_BASIS_POINTS
}

/** 하단 고정 바에 표시할 현재 합계(%) */
export function weightTotalPercent(items: readonly Pick<CalcItem, 'weight'>[]): number {
  return weightBasisPoints(items) / 100
}

/**
 * 종합 달성률 등급. 경계는 이상/미만으로 고정한다.
 *   양호 ≥ 80, 우려 60 이상 80 미만, 미달 < 60
 */
export function gradeOf(rate: number): Grade {
  if (rate >= GRADE_THRESHOLD.GOOD) return 'GOOD'
  if (rate >= GRADE_THRESHOLD.WARN) return 'WARN'
  return 'FAIL'
}

/**
 * 표의 평가영역 rowspan 계산. **인접한 동일 값만** 묶는다.
 *
 * [개발, 개발, 품질] → [{2}, {0}, {1}]  (0은 병합되어 렌더링하지 않는 행)
 * [개발, 품질, 개발] → [{1}, {1}, {1}]  (병합 없음)
 */
export function areaRowSpans(items: readonly Pick<CalcItem, 'evaluationArea'>[]): number[] {
  const spans = new Array<number>(items.length).fill(0)
  let i = 0
  while (i < items.length) {
    let j = i + 1
    while (j < items.length && items[j].evaluationArea === items[i].evaluationArea) j++
    spans[i] = j - i
    i = j
  }
  return spans
}
