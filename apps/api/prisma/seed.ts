/**
 * 데모용 씨드 데이터.
 *
 * 시안(docs/image/목록.png)의 12건을 재현한다. **전부 가상 인물이다.**
 * 실제 인사평가 데이터를 넣지 않는다(docs/design-reviews/auth-demo-scope.md).
 *
 * 각 평가의 항목 수치는 계산 결과가 시안의 종합 달성률과 일치하도록 역산했다.
 * 홍길동 건은 상세 시안(docs/image/상세.png)의 값을 그대로 쓴다.
 *
 * 실행: npm run db:seed
 */

import '../src/env.js'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import {
  GRADE_LABEL,
  formatBasePeriod,
  formatPercent1,
  gradeOf,
  totalAchievementRate,
  type BaseHalfValue,
} from '@kpi/core'

type SeedItem = {
  area: string
  name: string
  metric?: string
  targetValue?: string
  target: number
  achieved: number
  weight: number
}

type SeedEvaluation = {
  loginId: string
  name: string
  department: string
  team: string | null
  position: string
  year: number
  half: BaseHalfValue
  /** 시안 목록에 표시된 종합 달성률. 계산 결과가 이 값과 같아야 한다. */
  expectedRate: number
  items: SeedItem[]
}

/** 개발 직군에서 반복되는 항목 묶음. 가중치 40/30/30. */
function devItems(a1: number, a2: number, a3: number, t3 = 10): SeedItem[] {
  return [
    { area: '개발', name: '신규 기능 배포', metric: '배포 건수', targetValue: '반기 5건 이상', target: 10, achieved: a1, weight: 40 },
    { area: '개발', name: '기술 부채 정리', metric: '처리 이슈 수', targetValue: '월 2건', target: 10, achieved: a2, weight: 30 },
    { area: '품질', name: '코드 리뷰 참여', metric: '리뷰 건수', targetValue: '주 3건', target: t3, achieved: a3, weight: 30 },
  ]
}

const EVALUATIONS: SeedEvaluation[] = [
  // ── 2026 하반기 ──────────────────────────────────────────────
  {
    loginId: 'lee.mh', name: '이명희', department: '개발본부', team: '서비스팀', position: '책임',
    year: 2026, half: 'SECOND', expectedRate: 60.0, items: devItems(6, 6, 6),
  },
  {
    loginId: 'kim.cs', name: '김철수', department: '개발본부', team: '플랫폼팀', position: '선임',
    year: 2026, half: 'SECOND', expectedRate: 73.0, items: devItems(7, 5, 10),
  },
  {
    // 상세 시안(docs/image/상세.png)의 값 그대로. 종합 90.0%, 도넛 개발 70% / 품질 30%.
    loginId: 'hong.gd', name: '홍길동', department: '개발본부', team: '플랫폼팀', position: '책임',
    year: 2026, half: 'SECOND', expectedRate: 90.0, items: devItems(9, 8, 10),
  },
  {
    loginId: 'jung.th', name: '정태현', department: '경영지원본부', team: '인사팀', position: '팀장',
    year: 2026, half: 'SECOND', expectedRate: 85.0,
    items: [
      { area: '인사', name: '채용 목표 달성', metric: '입사자 수', targetValue: '반기 10명', target: 10, achieved: 10, weight: 40 },
      { area: '인사', name: '교육 과정 운영', metric: '과정 수', targetValue: '월 1회', target: 10, achieved: 5, weight: 30 },
      { area: '운영', name: '규정 개정 완료', metric: '개정 건수', targetValue: '반기 3건', target: 10, achieved: 10, weight: 30 },
    ],
  },
  {
    loginId: 'kang.sy', name: '강수연', department: '경영지원본부', team: null, position: '실장',
    year: 2026, half: 'SECOND', expectedRate: 85.0,
    items: [
      { area: '운영', name: '예산 집행률 관리', metric: '집행률', targetValue: '95% 이상', target: 10, achieved: 7, weight: 40 },
      { area: '운영', name: '내부 감사 대응', metric: '지적 사항 처리', targetValue: '전건 처리', target: 10, achieved: 9, weight: 30 },
      { area: '인사', name: '조직 개편 지원', metric: '완료 과제', targetValue: '반기 2건', target: 10, achieved: 10, weight: 30 },
    ],
  },
  {
    loginId: 'park.js', name: '박지성', department: '영업본부', team: '영업1팀', position: '과장',
    year: 2026, half: 'SECOND', expectedRate: 25.0,
    items: [
      { area: '영업', name: '신규 계약 체결', metric: '계약 건수', targetValue: '반기 10건', target: 10, achieved: 4, weight: 40 },
      { area: '영업', name: '기존 고객 재계약', metric: '재계약 건수', targetValue: '반기 10건', target: 10, achieved: 3, weight: 30 },
      { area: '영업', name: '신규 리드 발굴', metric: '리드 수', targetValue: '월 5건', target: 10, achieved: 0, weight: 30 },
    ],
  },
  {
    loginId: 'choi.ma', name: '최민아', department: '영업본부', team: '영업2팀', position: '대리',
    year: 2026, half: 'SECOND', expectedRate: 92.0,
    items: [
      { area: '영업', name: '신규 계약 체결', metric: '계약 건수', targetValue: '반기 10건', target: 10, achieved: 8, weight: 40 },
      { area: '영업', name: '기존 고객 재계약', metric: '재계약 건수', targetValue: '반기 10건', target: 10, achieved: 10, weight: 30 },
      { area: '영업', name: '고객 만족도', metric: '설문 점수', targetValue: '4.5점 이상', target: 10, achieved: 10, weight: 30 },
    ],
  },
  // ── 2026 상반기 ──────────────────────────────────────────────
  {
    // 목표개수 25인 항목으로 소수 달성률(77.6%)을 만든다.
    loginId: 'oh.jm', name: '오정민', department: '개발본부', team: '서비스팀', position: '책임',
    year: 2026, half: 'FIRST', expectedRate: 77.6, items: devItems(8, 10, 13, 25),
  },
  {
    // 목표개수 100인 항목으로 26.7%를 만든다.
    loginId: 'yoon.tj', name: '윤태진', department: '개발본부', team: '플랫폼팀', position: '사원',
    year: 2026, half: 'FIRST', expectedRate: 26.7, items: devItems(3, 4, 9, 100),
  },
  {
    loginId: 'han.ms', name: '한명수', department: '개발본부', team: null, position: '본부장',
    year: 2026, half: 'FIRST', expectedRate: 85.5, items: devItems(9, 9, 75, 100),
  },
  // ── 2페이지용 2건 (시안의 `총 12건`을 맞춘다) ────────────────
  {
    loginId: 'seo.jh', name: '서지훈', department: '영업본부', team: '영업1팀', position: '선임',
    year: 2026, half: 'FIRST', expectedRate: 68.0,
    items: [
      { area: '영업', name: '신규 계약 체결', metric: '계약 건수', targetValue: '반기 8건', target: 10, achieved: 8, weight: 40 },
      { area: '영업', name: '제안서 제출', metric: '제출 건수', targetValue: '월 2건', target: 10, achieved: 6, weight: 30 },
      { area: '품질', name: '고객 클레임 처리', metric: '처리율', targetValue: '100%', target: 10, achieved: 6, weight: 30 },
    ],
  },
  {
    loginId: 'nam.hj', name: '남효정', department: '경영지원본부', team: '재무팀', position: '과장',
    year: 2026, half: 'FIRST', expectedRate: 94.0,
    items: [
      { area: '운영', name: '결산 일정 준수', metric: '지연 일수', targetValue: '지연 0일', target: 10, achieved: 10, weight: 40 },
      { area: '운영', name: '비용 절감 과제', metric: '절감액 달성률', targetValue: '반기 목표 대비', target: 10, achieved: 8, weight: 30 },
      { area: '인사', name: '급여 처리 정확도', metric: '오류 건수', targetValue: '오류 0건', target: 10, achieved: 10, weight: 30 },
    ],
  },
]

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL이 없다. .env를 확인한다.')
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
}

async function main() {
  // 계산 결과가 시안 값과 일치하는지 먼저 확인한다. 어긋나면 씨드를 넣지 않는다.
  const mismatches: string[] = []
  for (const e of EVALUATIONS) {
    const calcItems = e.items.map((i) => ({
      evaluationArea: i.area,
      targetCount: i.target,
      achievedCount: i.achieved,
      weight: i.weight,
    }))
    const rate = totalAchievementRate(calcItems)
    const rounded = Number(formatPercent1(rate).replace('%', ''))
    if (rounded !== e.expectedRate) {
      mismatches.push(`${e.name}: 계산 ${rounded}% ≠ 기대 ${e.expectedRate}%`)
    }
  }
  if (mismatches.length > 0) {
    console.error('씨드 데이터의 계산 결과가 시안 값과 어긋난다:')
    mismatches.forEach((m) => console.error(`  - ${m}`))
    throw new Error('씨드 중단')
  }

  const prisma = createClient()
  try {
    // 데모 씨드이므로 기존 데이터를 비우고 다시 넣는다.
    await prisma.kpiItem.deleteMany()
    await prisma.kpiEvaluation.deleteMany()

    for (const e of EVALUATIONS) {
      await prisma.kpiEvaluation.create({
        data: {
          employeeLoginId: e.loginId,
          employeeName: e.name,
          departmentName: e.department,
          teamName: e.team,
          position: e.position,
          baseYear: e.year,
          baseHalf: e.half,
          items: {
            create: e.items.map((item, index) => ({
              evaluationArea: item.area,
              itemName: item.name,
              metric: item.metric ?? null,
              targetValue: item.targetValue ?? null,
              targetCount: item.target,
              achievedCount: item.achieved,
              weight: item.weight,
              sortOrder: index,
            })),
          },
        },
      })
    }

    console.log(`씨드 완료: 평가 ${EVALUATIONS.length}건`)
    for (const e of EVALUATIONS) {
      const rate = totalAchievementRate(
        e.items.map((i) => ({
          evaluationArea: i.area,
          targetCount: i.target,
          achievedCount: i.achieved,
          weight: i.weight,
        })),
      )
      console.log(
        `  ${e.name.padEnd(4)} ${e.department.padEnd(7)} ${formatBasePeriod(e.year, e.half)}` +
          ` ${formatPercent1(rate).padStart(7)} ${GRADE_LABEL[gradeOf(rate)]}`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
