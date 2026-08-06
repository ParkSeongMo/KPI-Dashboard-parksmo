# Server Action 계약 Design Review

작성일 2026-08-05 · 상태 **확정(3단계)** · 선행 [kpi-domain-model.md](kpi-domain-model.md), [stack-and-structure.md](stack-and-structure.md)

설계 순서 중 **③ Server Action 계약** 단계다. ②에서 Server Components + Server Actions로 정했으므로 REST 스펙 대신 액션 시그니처·입출력 타입·에러 표현을 잠근다. ④ 화면별 동작·검증은 별도 문서로 이어서 남긴다.

## 목표

- 변경(등록·수정·삭제)과 조회(목록·상세)의 경계, 입력 검증 위치, 에러 표현을 하나로 정한다.
- ①의 미해결 1·3·4·6번을 닫는다.

## 이번 단계에서 닫은 결정

| ① 미해결 | 결정 |
|---|---|
| 1. `달성개수 > 목표개수` 허용 여부 | **입력은 허용하고 달성률을 100%로 상한**. 원본 숫자는 그대로 보존한다 |
| 3. 동일 사원 + 동일 기준기간 중복 등록 | **DB unique 제약으로 저장 거부** |
| 4. 삭제 방식 | **소프트 삭제** (`deletedAt`) |
| 6. 목록 필터 일치 방식 / 페이지 크기 | **부분 일치(대소문자 무시) / 페이지 크기 10 고정** |

### 달성률 상한이 계산식에 주는 영향

```text
항목 달성률(%) = min(achievedCount / targetCount × 100, 100)
```

- 가중치 합이 100%로 강제되고 각 항목 달성률이 100% 이하이므로 **종합 달성률은 항상 0~100% 안에 있다.** 배지 구간·도넛·사원 간 비교가 일관된다.
- ①의 검증 픽스처(9/10, 8/10, 10/10)는 상한에 걸리는 값이 없어 그대로 유효하다.
- 상한은 `calc.ts`에 넣는다. 원본 `achievedCount`는 DB와 화면 표에 손대지 않고 남긴다.

## 액션과 조회의 경계

| 종류 | 이름 | 위치 | 호출자 |
|---|---|---|---|
| 조회 | `listKpiEvaluations(query)` | `lib/kpi/service.ts` | 목록 Server Component |
| 조회 | `getKpiEvaluation(id)` | `lib/kpi/service.ts` | 상세·수정 Server Component |
| 변경 | `createKpiEvaluation(input)` | `app/kpi/actions.ts` | 등록 폼 |
| 변경 | `updateKpiEvaluation(id, input)` | `app/kpi/actions.ts` | 수정 폼 |
| 변경 | `deleteKpiEvaluation(id)` | `app/kpi/actions.ts` | 상세의 삭제 버튼 |

**조회는 Server Action으로 만들지 않는다.** Server Component가 `service`를 직접 호출한다. Server Action은 POST 요청이라 조회에 쓰면 캐싱·프리페치를 잃는다.

## 입력 스키마 — `lib/kpi/schema.ts` 한 곳

zod 스키마가 검증의 유일한 출처다. 폼(클라이언트)과 Server Action(서버)이 같은 스키마를 쓴다.

```ts
const KpiItemInput = z.object({
  evaluationArea: z.string().trim().min(1).max(50),
  itemName:       z.string().trim().min(1).max(100),
  metric:         z.string().trim().max(100).optional(),   // ①: 선택
  targetValue:    z.string().trim().max(100).optional(),   // ①: 선택, 표시용
  targetCount:    z.number().int().min(0),                 // ①: 0 허용 — 목표 미설정 = 달성률 100%
  achievedCount:  z.number().int().min(0),                 // 상한 검증 없음 — 초과 입력 허용
  weight:         z.number().min(0.01).max(100),
})

const KpiEvaluationInput = z.object({
  employeeLoginId: z.string().trim().min(1).max(50),
  employeeName:    z.string().trim().min(1).max(50),
  departmentName:  z.string().trim().min(1).max(50),
  teamName:        z.string().trim().max(50).optional(),   // ①: 선택
  position:        z.string().trim().min(1).max(50),
  baseYear:        z.number().int().min(2000).max(2100),
  baseHalf:        z.enum(['FIRST', 'SECOND']),
  items:           z.array(KpiItemInput).min(1),
}).superRefine((v, ctx) => {
  // ②의 결정: 부동소수 비교 금지. 정수 환산으로 합 10000 확인
  const sum = v.items.reduce((a, it) => a + Math.round(it.weight * 100), 0)
  if (sum !== 10000) {
    ctx.addIssue({ code: 'custom', path: ['items'],
      message: `저장하려면 가중치 합이 100%여야 합니다 (현재 ${sum / 100}%)` })
  }
})
```

- `trim()`을 스키마에 둔다. ①에서 남긴 평가영역 표기 분화(`개발` / `개발 `)를 입력 경계에서 막는다.
- 가중치 합 메시지는 ①에서 정한 교체 문구를 그대로 쓴다. 시안의 `미달분은 달성률에 반영되지 않습니다`는 쓰지 않는다.
- 폼에서 넘어오는 값은 문자열이므로 숫자 필드는 폼 계층에서 파싱해 넘긴다. `weight`는 소수 둘째 자리까지 받는다.

## 반환 타입 — 판별 유니온

```ts
type ActionResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: ActionError }

type ActionError =
  | { code: 'VALIDATION';       fieldErrors: Record<string, string[]>; formErrors: string[] }
  | { code: 'DUPLICATE_PERIOD'; message: string }
  | { code: 'NOT_FOUND';        message: string }
```

**검증 실패는 반환값, 예기치 못한 오류는 throw다.**

- 반환하는 이유: 필수 누락·가중치 합 위반은 **폼 필드 아래에 메시지를 붙여야** 하고, 사용자가 입력값을 유지한 채 고쳐야 한다. 예외로 던지면 입력이 날아간다.
- throw하는 이유: DB 연결 실패 같은 것은 폼에 표시할 내용이 아니다. Next.js error boundary가 받는다.
- `useActionState`와 그대로 맞물리는 형태다.

### 에러 코드

| code | 발생 조건 | 화면 처리 |
|---|---|---|
| `VALIDATION` | zod 실패 — 필수 누락, `targetCount < 0`, 항목 0개, 가중치 합 ≠ 100% | 해당 필드 아래 메시지. 가중치 합은 하단 고정 바. 저장 버튼은 비활성하지 않고 클릭 시 검증한다(④) |
| `DUPLICATE_PERIOD` | 같은 `employeeLoginId` + `baseYear` + `baseHalf`가 이미 있다 (Prisma `P2002`) | 폼 상단 배너 |
| `NOT_FOUND` | 수정·삭제 대상이 없거나 이미 삭제됐다 | 목록으로 이동 + 안내 |

Prisma의 `P2002`를 `DUPLICATE_PERIOD`로 바꾸는 변환은 **`service.ts` 경계에서** 한다. Prisma 에러 코드를 `app/`까지 흘리지 않는다.

## unique 제약 × 소프트 삭제 — 함정

두 결정이 그냥 겹치면 버그가 된다.

> 홍길동 / 2026 하반기 평가를 **삭제**한 뒤 같은 사원·같은 기간을 다시 등록하면, 화면에는 아무것도 없는데 unique 제약이 걸려 저장이 거부된다.

일반 `@@unique([employeeLoginId, baseYear, baseHalf])`는 삭제된 행까지 포함해 검사하기 때문이다. **살아 있는 행만** 대상으로 해야 한다.

### 기각: 부분 unique 인덱스 (`WHERE deletedAt IS NULL`)

가장 깔끔한 방법이지만 **Prisma 7.x에서 못 쓴다.**

```sql
-- 이 방법은 채택하지 않는다
CREATE UNIQUE INDEX ... ON "KpiEvaluation"(...) WHERE "deletedAt" IS NULL;
```

- Prisma는 `@@unique`/`@@index`에 `WHERE`를 지원하지 않아 마이그레이션 SQL에 직접 넣는 것이 공식 권장이었다.
- 그런데 Prisma 7.x는 스키마에 선언이 없는 그 인덱스를 **drift로 보고 `prisma migrate dev`마다 `DROP INDEX`를 생성한다.** 스키마 변경이 없어도 매번 발생하고, 이슈는 열려 있으며 우회책이 없다.
- Prisma 8은 partial index를 스키마에서 선언할 수 있게 하지만 **Early Access이며 GA가 아니다.**
- 근거와 출처는 [stack-and-structure.md](stack-and-structure.md)의 「의존성 확인 결과」 5번.

### 채택: sentinel `deletedAt` + 평범한 `@@unique`

`deletedAt`을 **nullable이 아닌 필드**로 두고 unique 키에 포함시킨다.

```prisma
model KpiEvaluation {
  // ...
  deletedAt DateTime @default("1970-01-01T00:00:00Z")   // 살아 있음 = sentinel 값

  @@unique([employeeLoginId, baseYear, baseHalf, deletedAt])
}
```

- 살아 있는 행은 sentinel 값을 공유하므로 같은 사원·기간이면 **서로 충돌한다** → 중복 차단이 동작한다.
- 삭제된 행은 각자 다른 삭제 시각을 가지므로 충돌하지 않는다 → **삭제 후 재등록이 된다.**
- Prisma 표준 문법만 쓴다. 부분 인덱스가 없으므로 drift 버그를 아예 만나지 않는다.

**2026-08-05 실제 Neon DB로 검증 완료** (6개 케이스 전부 PASS):

| 케이스 | 결과 |
|---|---|
| 신규 등록 | 성공 |
| 같은 사원+기간 중복 등록 | `P2002`로 거부 |
| 소프트 삭제 후 살아 있는 동일키 조회 | 0건 |
| **삭제 후 같은 사원+기간 재등록** | **성공** ← sentinel 방식의 핵심 |
| 삭제된 행 보존 | 동일키 2건(삭제 1 + 살아있음 1) |
| 하드 삭제 시 항목 cascade | 동작 |

대가와 처리 방법:

- **"삭제됐는가" 판정이 `deletedAt IS NULL`이 아니다.** 모든 조회의 조건이 `deletedAt = SENTINEL`이 된다. 읽기 어려워지므로 상수와 공통 where 조각을 `service.ts` 한 곳에 두고 개별 쿼리가 직접 쓰지 않게 한다.

  ```ts
  export const ALIVE = new Date('1970-01-01T00:00:00Z')
  const aliveOnly = { deletedAt: ALIVE }        // 모든 조회가 이것만 쓴다
  ```

- 삭제는 `deletedAt = new Date()`로 덮는다. 되살리려면 `ALIVE`로 되돌린다(복원 UI는 만들지 않는다).
- 이론적 충돌: 같은 사원·기간을 만들고 지우는 일을 **같은 밀리초 안에** 두 번 하면 삭제된 두 행의 `deletedAt`이 같아져 충돌한다. 같은 키의 살아 있는 행이 항상 하나뿐이라 실제로는 거의 불가능하다. 발생 시 삭제를 1ms 늦춰 재시도하는 것으로 충분하다.
- **Prisma 8이 GA가 되면 재검토한다.** partial index + nullable `deletedAt`로 되돌리면 가독성이 회복된다. 그때 `@db.*` 제거 breaking change도 함께 처리한다.

## 조회 계약

### 목록

```ts
type KpiListQuery = {
  departmentName?: string
  teamName?: string
  employeeName?: string
  position?: string
  baseYear?: number
  baseHalf?: 'FIRST' | 'SECOND'
  page?: number          // 1부터
}

const PAGE_SIZE = 10     // 시안: 총 12건에 1·2 페이지

type KpiListResult = {
  rows: KpiListRow[]
  totalCount: number     // 시안의 `총 12건`
  page: number
  pageSize: number
}
```

- 텍스트 3개(부서명·팀·이름)는 **부분 일치, 대소문자 무시**(`contains` + `insensitive`).
- **빈 문자열과 미지정을 같게 본다.** `trim()` 후 빈 값이면 조건에서 제거한다. 시안의 `초기화`는 필터를 비우고 다시 조회하는 것과 같다.
- 직책·기준 기간 셀렉트의 `전체`는 조건 없음으로 변환한다.
- 모든 조회에 `deletedAt: ALIVE`(sentinel)가 들어간다. **빠뜨리면 삭제한 행이 목록에 다시 나타난다.** `service.ts`의 공통 where 조각으로 만들어 개별 쿼리가 잊지 못하게 한다.
- URL은 `/kpi?department=&team=&name=&position=&period=2026-SECOND&page=2` 형태다. `period`는 `<연도>-<FIRST|SECOND>` 한 덩어리로 주고받고, 파싱 실패 시 조건에서 무시한다.
- 기본 정렬은 **기준기간 내림차순 → 부서명 → 팀(빈 값 마지막) → 이름** 가나다순이다. ④에서 시안 10행의 순서를 역산해 확정했다([screen-behavior.md](screen-behavior.md)).

`KpiListRow`는 사원 정보 + `totalAchievementRate`(**반올림하지 않은 값**)를 담는다. 배지 등급은 행에 저장하지 않고 표시 시점에 `calc`의 등급 함수로 판정한다. 반올림은 `lib/format.ts`에서만 한다(①의 규칙).

### 종합 달성률 계산과 쿼리

종합 달성률은 저장하지 않고 파생 계산하므로(①), 목록 행마다 항목이 필요하다. `include: { items: true }`로 **한 번에 가져온다**. 페이지당 10건이므로 항목까지 합쳐도 규모가 작다. 건수가 커지면 SQL 집계로 옮긴다.

### 상세

`getKpiEvaluation(id)`는 항목을 `sortOrder asc`로 정렬해 함께 반환하고, `deletedAt: ALIVE`를 조건에 넣는다. 없으면 `null`을 돌려주고 화면이 404를 낸다.

## 변경 계약

### 등록

`createKpiEvaluation(input)` → `ActionResult<{ id: string }>`

1. zod 파싱. 실패 → `VALIDATION`.
2. `service.create`. `P2002` → `DUPLICATE_PERIOD`.
3. `sortOrder`는 입력 배열 순서대로 서버가 0부터 부여한다. 클라이언트가 보낸 값을 믿지 않는다.

### 수정

`updateKpiEvaluation(id, input)` → `ActionResult<{ id: string }>`

- **항목은 전체 교체다.** 개별 항목 diff/patch를 하지 않는다. 폼이 배열 전체를 제출하고 순서가 바뀔 수 있어, 기존 항목을 지우고 다시 넣는 것이 단순하고 순서 재부여와도 맞는다.
- **트랜잭션이 필수다.** 기존 항목 삭제만 성공하고 삽입이 실패하면 항목이 사라진 평가가 남는다. `prisma.$transaction`으로 삭제·삽입·평가 갱신을 묶는다.
- 대상이 없거나 이미 삭제됐으면(`deletedAt != ALIVE`) `NOT_FOUND`.

### 삭제

`deleteKpiEvaluation(id)` → `ActionResult<{ id: string }>`

- `deletedAt`을 sentinel에서 `now()`로 덮는다. 항목은 지우지 않는다. 부모가 조회에서 빠지므로 함께 사라진다.
- 이미 삭제된 대상은 `NOT_FOUND`를 돌려준다. 조용히 성공으로 처리하지 않는다.
- 스키마의 `onDelete: Cascade`는 소프트 삭제에서는 동작하지 않는다. 나중에 하드 정리 작업을 할 때 필요하므로 그대로 남겨 둔다.
- **복원 UI는 만들지 않는다.** 시안에 없다. 되살릴 일이 생기면 DB에서 처리한다.

### 캐시 무효화와 리다이렉트

- 세 액션 모두 성공 후 `revalidatePath('/kpi')`를 호출하고, 수정은 해당 상세 경로도 무효화한다.
- 성공 후 이동은 `redirect()`로 한다. **`redirect()`를 `try`/`catch` 안에서 부르면 안 된다.** Next.js의 `redirect()`는 내부적으로 특수 예외를 던지는 방식이라, 액션 전체를 `try`/`catch`로 감싸면 catch가 그것을 삼켜 이동이 조용히 죽는다. `redirect()`는 `try` 블록 밖에서 호출한다.

## 보안 — 데모 전제로 확정

**Server Action은 공개 HTTP 엔드포인트다.** 화면에 버튼이 없어도 액션 ID를 아는 누구나 POST를 보낼 수 있다.

⑤에서 **애플리케이션 인증을 만들지 않기로 확정했다**(데모 전제 — [auth-demo-scope.md](auth-demo-scope.md)). 대신 두 가지를 지킨다.

- **Vercel Deployment Protection**을 Preview·Production 모두에 켠다. 코드 없이 플랫폼 레벨에서 막는다.
- **씨드는 가상 인물로만 만든다.** 실제 인사평가 데이터를 넣지 않는다.

감사 주체가 없으므로 `createdBy`·`updatedBy`·`deletedBy` 컬럼을 만들지 않는다.

## 엣지케이스

- 폼에서 항목을 모두 지우고 저장 → 가중치 합 0%와 `items` 최소 1개 위반이 동시에 걸린다. 메시지가 두 개 뜨지 않게 항목 개수를 먼저 검사한다.
- `weight`에 `33.333`처럼 셋째 자리를 넣으면 `Math.round(w * 100)`에서 값이 뭉개진다. 스키마에서 소수 둘째 자리까지로 제한하고 폼 `step`도 `0.01`로 맞춘다.
- 수정 화면을 열어 둔 채 다른 곳에서 그 평가가 삭제되면, 저장 시 `NOT_FOUND`가 온다. 폼을 유지하지 말고 목록으로 보낸다.
- `achievedCount`가 `targetCount`를 넘으면 표에는 원본(12/10)이 보이는데 달성률은 100.0%다. 사용자가 계산 오류로 오해할 수 있다 — 상한이 걸렸다는 표시가 필요한지는 ④에서 다룬다.
- 같은 사원·기간을 두 사용자가 동시에 등록 → 하나만 unique 제약을 통과한다. 실패한 쪽에 `DUPLICATE_PERIOD`가 정상적으로 간다. 애플리케이션 사전 조회로 막으려 하면 경합에 뚫린다. **DB 제약이 최종 방어선이다.**
- `page`가 범위를 넘으면 빈 목록이 된다. 총건수를 함께 반환하므로 화면이 1페이지로 되돌린다.

## 검증 기준

- 단위 테스트 (Vitest)
  - zod: 가중치 합 `99.99%`·`100.01%` 거부, `33.33 + 33.33 + 33.34` 통과, `targetCount = 0` **통과**(목표 미설정), `targetCount = -1` 거부, `items: []` 거부.
  - calc: `12/10` → 달성률 `100`(상한 동작), ①의 픽스처 3행 → 종합 `90`, 목록 10건 → 배지 5/3/2.
  - 에러 매핑: Prisma `P2002` 입력 → `DUPLICATE_PERIOD` 변환.
- 통합·E2E (Playwright)
  - 같은 사원·기간을 두 번 등록 → 두 번째에서 폼 상단 배너로 중복 안내.
  - 등록 → 삭제 → **같은 사원·기간 재등록이 성공한다**(부분 unique 인덱스가 실제로 동작하는지 확인하는 핵심 케이스).
  - 삭제한 평가가 목록·상세에서 사라지고, 상세 URL 직접 접근 시 404.
  - 수정에서 항목 순서를 바꿔 저장하면 상세 표 순서가 그대로 반영된다.
  - 항목 삽입 실패를 강제한 상황에서 기존 항목이 남아 있다(트랜잭션 확인).

## Out of Scope

- 화면별 상호작용·유효성 메시지 문구·접근성 (④)
- 인증/인가 구현 (위 보안 절에 위험으로 기록)
- 목록 정렬 UI, 엑셀 내려받기, 감사 로그
- 삭제 복원 화면

## 미해결 질문

1. ~~목록 기본 정렬~~ → **해소**. ④에서 시안 근거로 확정했다.
2. ~~인증을 언제 붙일 것인가?~~ → **해소**. ⑤에서 데모 전제로 인증을 만들지 않기로 확정했다.
3. ~~달성률 상한 표시 여부~~ → **해소**. ④에서 표시하기로 정했다.
4. 부분 unique 인덱스가 Prisma drift와 충돌하지 않는지 **열림**. Context7 확인 결과에 따라 sentinel 대안으로 내려갈지 결정한다.
5. ①의 미해결 7번(평가영역 코드화) **열림**. ③의 `trim()`과 ④의 자동완성으로 완화만 했다.
