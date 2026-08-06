/**
 * KPI 도메인 상수.
 *
 * 근거: docs/design-reviews/kpi-domain-model.md, screen-behavior.md
 * 이 파일이 셀렉트 옵션과 검증의 SSOT다. 화면과 zod 스키마가 여기서 가져온다.
 */

/** 살아 있는 행을 뜻하는 deletedAt sentinel. schema.prisma의 @default와 같아야 한다. */
export const ALIVE = new Date('1970-01-01T00:00:00Z')

/** 가중치 합 검증 기준. 정수 환산(× 100)으로 비교해 부동소수 오탐을 막는다. */
export const WEIGHT_TOTAL_BASIS_POINTS = 10_000

/** 목록 페이지 크기. 시안의 `총 12건` + 1·2 페이지와 일치한다. */
export const PAGE_SIZE = 10

/**
 * 직책 목록. 등록/수정 폼이 셀렉트이므로 고정 목록이다.
 *
 * 시안 10건에서 관찰된 8개이며 직급 흐름 순서로 두었다.
 * 목록 완전성과 표시 순서는 확인 필요 항목이다(screen-behavior.md 미해결 1번).
 */
export const POSITIONS = [
  '사원',
  '대리',
  '과장',
  '선임',
  '책임',
  '팀장',
  '실장',
  '본부장',
] as const

export type Position = (typeof POSITIONS)[number]

export const BASE_HALVES = ['FIRST', 'SECOND'] as const
export type BaseHalfValue = (typeof BASE_HALVES)[number]

/** `2026년 하반기` 형태로 표시한다. 시안의 목록·상세 표기와 같다. */
export function formatBasePeriod(year: number, half: BaseHalfValue): string {
  return `${year}년 ${half === 'FIRST' ? '상반기' : '하반기'}`
}

/**
 * 종합 달성률 등급.
 *
 * 양호 ≥ 80 / 우려 60 이상 80 미만 / 미달 < 60.
 * 시안 10건과 전부 일치한다(양호 4건·우려 3건·미달 2건).
 */
export const GRADES = ['GOOD', 'WARN', 'FAIL'] as const
export type Grade = (typeof GRADES)[number]

export const GRADE_LABEL: Record<Grade, string> = {
  GOOD: '양호',
  WARN: '우려',
  FAIL: '미달',
}

export const GRADE_THRESHOLD = { GOOD: 80, WARN: 60 } as const
