/**
 * KPI 계산 규칙 회귀 테스트.
 *
 * 픽스처는 docs/design-reviews/kpi-domain-model.md 의 검증 기준을 그대로 옮긴 것이다.
 * 시안(docs/image/)에서 읽은 실제 숫자이므로 이 값이 바뀌면 설계와 어긋난 것이다.
 */

import { describe, expect, it } from 'vitest'
import {
  areaRowSpans,
  areaWeightRatios,
  gradeOf,
  isRateCapped,
  isWeightTotalValid,
  itemAchievementRate,
  itemWeightedScore,
  totalAchievementRate,
  weightTotalPercent,
  type CalcItem,
} from '../src/calc.js'
import { formatPercent1, formatScore1, round1 } from '../src/format.js'

/** 상세 시안 — 홍길동 / 2026년 하반기. 종합 90.0%, 도넛 개발 70% / 품질 30% */
const DETAIL_FIXTURE: CalcItem[] = [
  { evaluationArea: '개발', targetCount: 10, achievedCount: 9, weight: 40 },
  { evaluationArea: '개발', targetCount: 10, achievedCount: 8, weight: 30 },
  { evaluationArea: '품질', targetCount: 10, achievedCount: 10, weight: 30 },
]

/** 목록 시안 10건의 종합 달성률과 배지 */
const LIST_FIXTURE = [
  { name: '이명희', rate: 60.0, grade: 'WARN' },
  { name: '김철수', rate: 73.0, grade: 'WARN' },
  { name: '홍길동', rate: 90.0, grade: 'GOOD' },
  { name: '정태현', rate: 85.0, grade: 'GOOD' },
  { name: '강수연', rate: 85.0, grade: 'GOOD' },
  { name: '박지성', rate: 25.0, grade: 'FAIL' },
  { name: '최민아', rate: 92.0, grade: 'GOOD' },
  { name: '오정민', rate: 77.6, grade: 'WARN' },
  { name: '윤태진', rate: 26.7, grade: 'FAIL' },
  { name: '한명수', rate: 85.5, grade: 'GOOD' },
] as const

describe('항목 달성률', () => {
  it('상세 시안 3행이 90 / 80 / 100 이다', () => {
    expect(DETAIL_FIXTURE.map(itemAchievementRate)).toEqual([90, 80, 100])
  })

  it('목표를 초과하면 100으로 상한을 둔다', () => {
    expect(itemAchievementRate({ targetCount: 10, achievedCount: 12 })).toBe(100)
    expect(itemAchievementRate({ targetCount: 10, achievedCount: 10 })).toBe(100)
  })

  it('상한 표시 대상은 초과한 경우만이다', () => {
    expect(isRateCapped({ targetCount: 10, achievedCount: 12 })).toBe(true)
    expect(isRateCapped({ targetCount: 10, achievedCount: 10 })).toBe(false)
  })
})

describe('목표개수 0 — 목표 미설정', () => {
  it('목표개수가 0이면 달성률이 100%다', () => {
    expect(itemAchievementRate({ targetCount: 0, achievedCount: 0 })).toBe(100)
    expect(itemAchievementRate({ targetCount: 0, achievedCount: 5 })).toBe(100)
  })

  it('0으로 나누기가 발생하지 않는다', () => {
    const rate = itemAchievementRate({ targetCount: 0, achievedCount: 3 })
    expect(Number.isFinite(rate)).toBe(true)
  })

  it('목표개수 0은 초과 달성 상한으로 보지 않는다', () => {
    // 둘 다 달성률은 100%지만 원인이 다르다. 상한 표시는 초과한 경우에만 붙는다.
    expect(isRateCapped({ targetCount: 0, achievedCount: 5 })).toBe(false)
    expect(isRateCapped({ targetCount: 10, achievedCount: 12 })).toBe(true)
  })

  it('가중점수와 종합 달성률에 100%로 반영된다', () => {
    const items: CalcItem[] = [
      { evaluationArea: '개발', targetCount: 0, achievedCount: 0, weight: 40 },
      { evaluationArea: '개발', targetCount: 10, achievedCount: 5, weight: 60 },
    ]
    // 100% × 40% = 40, 50% × 60% = 30
    expect(items.map(itemWeightedScore)).toEqual([40, 30])
    expect(totalAchievementRate(items)).toBe(70)
  })

  it('모든 항목의 목표개수가 0이면 종합 달성률이 100%다', () => {
    const items: CalcItem[] = [
      { evaluationArea: '개발', targetCount: 0, achievedCount: 0, weight: 50 },
      { evaluationArea: '품질', targetCount: 0, achievedCount: 0, weight: 50 },
    ]
    expect(totalAchievementRate(items)).toBe(100)
  })
})

describe('가중점수와 종합 달성률', () => {
  it('상세 시안 3행의 가중점수가 36.0 / 24.0 / 30.0 이다', () => {
    expect(DETAIL_FIXTURE.map(itemWeightedScore)).toEqual([36, 24, 30])
  })

  it('종합 달성률이 90.0% 이다 (상세 헤더와 일치)', () => {
    expect(totalAchievementRate(DETAIL_FIXTURE)).toBe(90)
  })

  it('가중치 합이 100%이고 모든 항목이 100% 달성이면 종합이 정확히 100%다', () => {
    const perfect = DETAIL_FIXTURE.map((i) => ({ ...i, achievedCount: i.targetCount }))
    expect(totalAchievementRate(perfect)).toBe(100)
  })

  it('초과 달성이 있어도 종합이 100%를 넘지 않는다', () => {
    const over = DETAIL_FIXTURE.map((i) => ({ ...i, achievedCount: i.targetCount * 2 }))
    expect(totalAchievementRate(over)).toBe(100)
  })
})

describe('평가영역 비중', () => {
  it('상세 시안이 개발 70% / 품질 30% 이다 (도넛과 일치)', () => {
    expect(areaWeightRatios(DETAIL_FIXTURE)).toEqual([
      { area: '개발', weight: 70 },
      { area: '품질', weight: 30 },
    ])
  })

  it('인접하지 않은 같은 영역도 하나로 합산한다', () => {
    const scattered: CalcItem[] = [
      { evaluationArea: '개발', targetCount: 10, achievedCount: 10, weight: 40 },
      { evaluationArea: '품질', targetCount: 10, achievedCount: 10, weight: 30 },
      { evaluationArea: '개발', targetCount: 10, achievedCount: 10, weight: 30 },
    ]
    expect(areaWeightRatios(scattered)).toEqual([
      { area: '개발', weight: 70 },
      { area: '품질', weight: 30 },
    ])
  })
})

describe('평가영역 rowspan (표시 규칙)', () => {
  it('인접한 동일 영역만 병합한다', () => {
    expect(areaRowSpans(DETAIL_FIXTURE)).toEqual([2, 0, 1])
  })

  it('인접하지 않으면 병합하지 않는다', () => {
    const scattered = [
      { evaluationArea: '개발' },
      { evaluationArea: '품질' },
      { evaluationArea: '개발' },
    ]
    expect(areaRowSpans(scattered)).toEqual([1, 1, 1])
  })
})

describe('가중치 합 검증 — 부동소수 오탐 방지', () => {
  it('40 + 30 + 30 = 100% 통과', () => {
    expect(isWeightTotalValid(DETAIL_FIXTURE)).toBe(true)
  })

  it('33.33 + 33.33 + 33.34 = 100% 통과 (정수 환산이 동작한다)', () => {
    const equal = [{ weight: 33.33 }, { weight: 33.33 }, { weight: 33.34 }]
    expect(isWeightTotalValid(equal)).toBe(true)
    expect(weightTotalPercent(equal)).toBe(100)
  })

  it('99.99% 와 100.01% 는 거부한다', () => {
    expect(isWeightTotalValid([{ weight: 99.99 }])).toBe(false)
    expect(isWeightTotalValid([{ weight: 100.01 }])).toBe(false)
  })

  it('80% 상태의 합계를 80으로 표시한다 (수정 시안 하단 바)', () => {
    expect(weightTotalPercent([{ weight: 40 }, { weight: 40 }])).toBe(80)
  })

  it('항목이 없으면 0%이고 통과하지 않는다', () => {
    expect(weightTotalPercent([])).toBe(0)
    expect(isWeightTotalValid([])).toBe(false)
  })
})

describe('배지 등급', () => {
  it('목록 시안 10건이 양호 5 / 우려 3 / 미달 2 로 나온다', () => {
    for (const row of LIST_FIXTURE) {
      expect(gradeOf(row.rate), row.name).toBe(row.grade)
    }
    const counts = LIST_FIXTURE.reduce<Record<string, number>>((acc, r) => {
      acc[r.grade] = (acc[r.grade] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toEqual({ GOOD: 5, WARN: 3, FAIL: 2 })
  })

  it('경계는 이상/미만으로 고정한다', () => {
    expect(gradeOf(80)).toBe('GOOD')
    expect(gradeOf(79.9)).toBe('WARN')
    expect(gradeOf(60)).toBe('WARN')
    expect(gradeOf(59.9)).toBe('FAIL')
    expect(gradeOf(0)).toBe('FAIL')
    expect(gradeOf(100)).toBe('GOOD')
  })
})

describe('표시 반올림', () => {
  it('소수 1자리로 반올림한다', () => {
    expect(round1(77.64)).toBe(77.6)
    expect(round1(85.45)).toBe(85.5)
    expect(round1(26.65)).toBe(26.7)
    expect(round1(90)).toBe(90)
  })

  it('시안 표기 형식과 같다', () => {
    expect(formatPercent1(90)).toBe('90.0%')
    expect(formatPercent1(77.64)).toBe('77.6%')
    expect(formatScore1(36)).toBe('36.0')
  })

  it('계산 계층은 반올림하지 않는다 — 중간 반올림 시 누적 오차가 생긴다', () => {
    const thirds: CalcItem[] = [
      { evaluationArea: 'A', targetCount: 3, achievedCount: 1, weight: 33.33 },
      { evaluationArea: 'A', targetCount: 3, achievedCount: 1, weight: 33.33 },
      { evaluationArea: 'A', targetCount: 3, achievedCount: 1, weight: 33.34 },
    ]
    const raw = totalAchievementRate(thirds)
    // 반올림하지 않은 원본값이 유지되어야 한다 (1/3 = 33.333...%)
    expect(raw).toBeCloseTo(33.3333333, 6)
    // 표시 시점에만 1자리로 줄어든다
    expect(formatPercent1(raw)).toBe('33.3%')
  })
})
