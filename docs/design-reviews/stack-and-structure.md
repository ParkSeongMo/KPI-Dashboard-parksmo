# 스택·프로젝트 구조 Design Review

작성일 2026-08-05 · 상태 **확정(2단계)** · 선행 [kpi-domain-model.md](kpi-domain-model.md)

설계 순서 중 **② 스택·프로젝트 구조** 단계다. ③ API 계약(Server Action 계약), ④ 화면별 동작·검증은 별도 문서로 이어서 남긴다.

## 목표

- Vercel 호스팅 + Neon Postgres 전제에서 구현 스택과 디렉터리 계층, 실행 명령을 잠근다.
- ①에서 확정한 계산 규칙이 **한 곳에만 존재**하도록 배치를 정한다.

## 확정 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 호스팅 | **Vercel** | 사용자 결정 |
| DB | **Neon Postgres** | 사용자 결정 |
| 프레임워크 | **Next.js App Router + TypeScript** | Vercel/Neon 전제에서 프론트·백엔드를 한 앱의 계층으로 나눈다 |
| 데이터 접근 | **Prisma** + Neon driver adapter | 스키마 파일 하나로 마이그레이션 관리 |
| 계층 방식 | **Server Components + Server Actions** | 별도 REST 없음. 도메인 로직은 service 레이어로 분리 |
| 스타일/컴포넌트 | **Tailwind CSS + shadcn/ui** | 시안의 회색조 admin UI를 Table·Select·Badge·Input·Button으로 재현 |
| 차트 | **Recharts** | 상세의 도넛 + 범례(`개발 (70%)` / `품질 (30%)`) |
| 폼/검증 | **react-hook-form + zod** | 동적 항목 배열과 실시간 가중치 합계에 필요 |
| 단위 테스트 | **Vitest** | ①의 계산 검증 픽스처 |
| E2E | **Playwright** | 등록→상세 플로우, 가중치 100% 차단 |
| 패키지 매니저 | **npm** | 로컬에 npm 11.5.1 확인됨, Vercel 기본값 |

**버전 확인은 2026-08-05에 완료했다**(아래 「의존성 확인 결과」). 핵심은 두 가지다.

- **Next.js 16.3**을 쓴다. `next lint`가 Next 16에서 제거됐으므로 ESLint를 직접 호출한다.
- **Prisma는 `^7`로 고정한다**(설치된 것은 7.9.1). Prisma 8은 Early Access이며 GA가 아니고, `@db.*` 제거 같은 breaking change가 진행 중이다.

## 계산 로직 배치 — ①의 SSOT 문제 해소

①에서 "계산식이 프론트 실시간 미리보기와 백엔드 저장·조회 양쪽에 들어가므로 한쪽을 SSOT로 정한다"고 남겼다. 단일 Next.js 앱이므로 **모듈 하나를 양쪽이 그대로 import**하면 중복 구현 자체가 사라진다.

- `lib/kpi/calc.ts` — 순수 함수만. DB·React·환경변수에 의존하지 않는다.
- 서버(상세·목록 렌더링, Server Action 저장 검증)와 클라이언트(등록/수정 폼의 실시간 합계·달성률 미리보기)가 **같은 파일**을 쓴다.
- 반올림은 `calc.ts`에 넣지 않는다. 표시 반올림은 `lib/format.ts`의 함수 하나로만 수행한다(①의 반올림 규칙).

## 디렉터리 구조

```text
/
├─ app/
│  ├─ layout.tsx                  상단 `KPI 대시보드` 바
│  ├─ page.tsx                    → /kpi 리다이렉트
│  └─ kpi/
│     ├─ page.tsx                 목록 (검색 조건은 searchParams)
│     ├─ actions.ts               Server Actions (얇게 유지)
│     ├─ new/page.tsx             등록
│     └─ [id]/
│        ├─ page.tsx              상세
│        └─ edit/page.tsx         수정
├─ components/
│  ├─ ui/                         shadcn/ui 생성물 (직접 수정 가능)
│  └─ kpi/
│     ├─ kpi-filters.tsx          부서명·팀·이름·직책·기준기간 + 초기화/검색
│     ├─ kpi-item-fields.tsx      항목 반복 배열, 추가/삭제/순서 이동
│     ├─ weight-summary-bar.tsx   하단 고정 바, 현재 합계와 저장 가능 여부
│     ├─ achievement-badge.tsx    양호/우려/미달
│     └─ area-donut.tsx           평가영역 비중 도넛
├─ lib/
│  ├─ db.ts                       Prisma client 싱글턴 + Neon adapter
│  ├─ format.ts                   표시 반올림(소수 1자리) 전용
│  └─ kpi/
│     ├─ calc.ts                  달성률·가중점수·종합 달성률·영역 비중·배지 (순수)
│     ├─ schema.ts                zod 입력 스키마 + 가중치 합 100% 검증
│     └─ service.ts               조회/생성/수정/삭제, Prisma 접근
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ tests/
│  ├─ unit/calc.test.ts
│  └─ e2e/kpi.spec.ts
├─ .env.example                   DATABASE_URL, DIRECT_URL (실제 값 없음)
├─ vitest.config.ts
└─ playwright.config.ts
```

### 계층 규칙

```text
app (화면·Server Action)  →  lib/kpi/service.ts  →  prisma
                          ↘  lib/kpi/calc.ts (순수, 어디서든 import)
```

- `app/`에서 Prisma를 직접 부르지 않는다. 반드시 `service.ts`를 거친다.
- `actions.ts`는 얇게 둔다: zod 파싱 → service 호출 → `revalidatePath`. 도메인 규칙을 여기 넣지 않는다.
- `calc.ts`는 Prisma 타입에 의존하지 않는다. 평범한 입력 타입을 받아 나중에 REST로 드러낼 때도 그대로 쓴다.

## 데이터 모델 (Prisma)

①의 필드 정의를 그대로 옮긴 초안이다. 실제 `schema.prisma`는 스캐폴딩 시 작성한다.

```prisma
enum BaseHalf { FIRST SECOND }

model KpiEvaluation {
  id              String   @id @default(cuid())
  employeeLoginId String
  employeeName    String
  departmentName  String
  teamName        String?          // ①: 선택 필드 (목록에 "-" 표시 행 존재)
  position        String
  baseYear        Int
  baseHalf        BaseHalf
  items           KpiItem[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  // ③: 소프트 삭제. nullable이 아닌 sentinel 방식이다.
  //     살아 있음 = 1970-01-01. 부분 인덱스를 피하려는 선택이다(확인 결과 5번).
  deletedAt       DateTime @default("1970-01-01T00:00:00Z")

  @@index([baseYear, baseHalf])
  @@index([departmentName])
  @@index([employeeName])
  @@index([deletedAt])
  // ③: 살아 있는 행끼리만 충돌하므로 삭제 후 재등록이 가능하다
  @@unique([employeeLoginId, baseYear, baseHalf, deletedAt])
}

model KpiItem {
  id             String        @id @default(cuid())
  evaluationId   String
  evaluation     KpiEvaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  evaluationArea String
  itemName       String
  metric         String?          // ①: 선택
  targetValue    String?          // ①: 선택, 표시용 텍스트 (계산에 쓰지 않음)
  targetCount    Int              // ①: 0 이상. 0이면 목표 미설정 = 달성률 100%
  achievedCount  Int              // ①: 0 이상
  weight         Decimal  @db.Decimal(5, 2)
  sortOrder      Int

  @@index([evaluationId, sortOrder])
}
```

### 결정: `weight`를 `Decimal(5,2)`로 둔다 — ①의 미해결 2번 해소

- ①에서 "가중치 정수만 허용하면 3개 균등 배분에서 합 100%를 맞출 수 없다(33+33+33=99)"를 미해결로 남겼다.
- `Decimal(5,2)`는 정수(`40.00`)와 소수(`33.33`+`33.33`+`33.34`)를 모두 담는다. 나중에 정수로 좁히더라도 스키마 변경이 필요 없다.
- **가중치 합 100% 검증은 부동소수로 하지 않는다.** `0.1 + 0.2 !== 0.3` 때문에 `33.33*3` 같은 입력이 오탐된다. 검증은 **정수 환산(가중치 × 100)으로 합이 10000인지** 비교한다. 이 규칙은 `lib/kpi/schema.ts`에 둔다.
- 입력 단위는 소수 둘째 자리까지 허용한다.

`onDelete: Cascade`는 ③에서 소프트 삭제로 결정됐으므로 평상시 동작하지 않는다. 나중에 하드 정리 작업을 할 때 필요하므로 그대로 남겨 둔다.

## Neon 연결 — 두 개의 URL

| 환경변수 | 엔드포인트 | 용도 | 어디서 읽히는가 |
|---|---|---|---|
| `DATABASE_URL` | pooled (`-pooler` 호스트) | 앱 런타임 쿼리 | `lib/db.ts` → Neon 어댑터 → `PrismaClient` |
| `DIRECT_URL` | direct | `prisma migrate` 계열 | `prisma.config.ts` 의 `datasource.url` |

### Prisma 7 실제 구성 (2026-08-05 실행으로 확인)

**처음에 참고한 Neon 문서가 Prisma v6 기준이었고, v7에서 구조가 바뀌었다.** `npx prisma validate`가 거부해서 발견했다.

- **`schema.prisma`의 `datasource`에서 `url`과 `directUrl`이 제거됐다.** 넣으면 `P1012` 오류가 난다. `provider`만 남긴다.
- 연결 URL은 **`prisma.config.ts`**로 옮겼다. `directUrl` 속성 자체가 없어지고 `datasource.url` 하나로 통합됐다.
- 그 `datasource.url`은 **Migrate가 쓰는 연결**이므로 **`DIRECT_URL`을 넣는다.** 런타임은 이 파일을 쓰지 않는다.
- `prisma.config.ts`는 `.env`를 자동으로 읽지 않는다. `import 'dotenv/config'`가 필요하고 `dotenv`를 의존성에 추가했다.
- 어댑터는 v7에서 자동 처리되므로 config의 `adapter` 속성도 없어졌다.

```ts
// prisma.config.ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env<{ DIRECT_URL: string }>('DIRECT_URL') },  // ← direct 엔드포인트
})
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"   // url / directUrl 을 두지 않는다
}
```
- 런타임은 Neon driver adapter(`@prisma/adapter-neon` + `@neondatabase/serverless`)로 연결한다. 서버리스에서 연결을 재사용하기 위한 구성이며, `lib/db.ts`가 pooled `DATABASE_URL`을 어댑터에 넘긴다.
- `.env.example`에는 키 이름과 형식만 둔다. 실제 연결 문자열은 커밋하지 않는다. Vercel에서는 Development/Preview/Production 환경변수를 분리한다.
- **마이그레이션을 빌드에 넣는다 — 단 Neon 네이티브 Vercel 통합을 먼저 설치한 뒤에.** 통합이 preview 배포마다 격리된 DB 브랜치를 만들어 주므로 Preview 빌드가 Production 스키마를 건드리지 않는다. 통합 없이 넣으면 안 된다. 근거는 아래 「의존성 확인 결과」 3번.

## 실행 명령

2026-08-05 스캐폴딩으로 `package.json`에 반영했다. **검증 상태를 명령별로 구분한다.**

| 명령 | 검증 |
|---|---|
| `npx prisma validate` | ✅ 통과 |
| `npx prisma generate` | ✅ 통과 (v7.9.1 → `node_modules/@prisma/client`) |
| `npm run build` | ✅ 통과 (Next 16.3.0, Turbopack) |
| `npm run typecheck` | ✅ 통과 (오류 0) |
| `npm run lint` | ✅ 통과 (오류 0) |
| `npm run test` | ✅ 통과 (22 tests) |
| `npx prisma migrate deploy` | ✅ 통과 — `20260805174739_init` 적용. Neon에 테이블 2개 생성 |
| `npm run db:seed` | ✅ 통과 — 가상 인물 12건(항목 36건). 시안 달성률 10건 전부 일치 |
| `npm run test:e2e` | ✅ 통과 — Playwright 13개 |

### shadcn/ui가 Radix가 아니라 Base UI를 쓴다 (2026-08-05 확인)

②의 의존성 조사에서 놓친 부분이다. 설치된 shadcn은 `@base-ui/react`를 쓰고 Radix를 쓰지 않는다. 실제로 부딪힌 차이:

| 항목 | Radix 기준 통념 | 실제 (Base UI) |
|---|---|---|
| 링크 버튼 | `<Button asChild><Link/></Button>` | **`asChild`가 없다.** `<Link className={buttonVariants({...})}>` 또는 `render` prop |
| 컴포넌트 합성 | `asChild` | `render={<OtherComponent />}` (`use-render`) |
| `Select` 변경 콜백 | `(value: string) => void` | **`(value: string \| null, details) => void`** — null 처리 필요 |
| `Select.Value` | 선택 항목 라벨 자동 표시 | **자동 매핑 없음.** children으로 라벨을 직접 넘기지 않으면 내부값이 노출된다 |

마지막 항목은 실제 버그로 이어졌다 — 필터 셀렉트에 `전체` 대신 내부값 `__all__`이 표시됐고 렌더 확인으로 잡았다.

`node_modules/@base-ui/react/docs/`에 컴포넌트 문서가 들어 있다. Next.js의 `node_modules/next/dist/docs/`와 같은 방식으로 참조한다.

### Neon 호스트 형태 — 실제 값으로 확인

콘솔의 연결 문자열에 **compute 세그먼트 `c-3`이 들어 있었다.** 호스트를 손으로 조립하면 이 부분을 놓친다.

```text
pooled  ep-<id>-pooler.c-3.ap-southeast-1.aws.neon.tech   ← 접속 성공
direct  ep-<id>.c-3.ap-southeast-1.aws.neon.tech          ← 접속 성공
        ep-<id>.ap-southeast-1.aws.neon.tech              ← 접속 실패 (c-3 빼면 안 된다)
```

- **direct 호스트도 `c-3`을 유지한다.** `-pooler`만 제거한다.
- 쿼리 파라미터는 `?sslmode=require&channel_binding=require`를 그대로 쓴다.
- **호스트를 조립하지 말고 콘솔 문자열을 통째로 복사한다.** 조립 시도가 세 번 실패했고 원인은 리전 오타와 `c-3` 누락이었다.
- 참고: Neon은 엔드포인트를 찾지 못할 때도 `password authentication failed`를 반환한다. 이 오류만으로 비밀번호 문제라고 단정할 수 없다.

`tsc --noEmit`은 **`prisma generate`와 `next build`를 먼저 돌려야 통과한다.** 각각 `@prisma/client` 타입과 `.next/types`의 `LayoutProps`를 만든다. 새로 클론한 환경에서 `typecheck`만 실행하면 실패한다.

| 명령 | 내용 |
|---|---|
| `npm run dev` | `next dev` |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | `next start` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` — ESLint CLI 직접 호출. `next lint`는 Next 16에서 제거됐다 |
| `npm run test` | `vitest run` |
| `npm run test:e2e` | `playwright test` |
| `npx prisma migrate dev --name <name>` | 로컬 마이그레이션. cwd는 저장소 루트, `DIRECT_URL` 필요 |
| `npx prisma migrate deploy` | 배포 대상 마이그레이션 적용 |
| `npx prisma studio` | 데이터 확인 |

shell은 zsh(macOS), cwd는 저장소 루트다.

## 의존성 확인 결과 (2026-08-05, 공식 문서·릴리스 노트 기준)

Context7 MCP가 이번 세션에 로드되지 않아 웹 검색과 공식 문서 조회로 대체 확인했다. 출처는 문서 끝에 있다.

| # | 확인 항목 | 결과 |
|---|---|---|
| 1 | Next.js 현재 안정 버전 | **16.3** (2026-08-03 릴리스) |
| 2 | `next lint` 상태 | **Next 16에서 제거됨.** `next.config`의 `eslint` 옵션도 제거. **`next build`가 더 이상 lint를 돌리지 않는다** |
| 3 | Prisma 최신 안정 버전 | 설치된 것은 **7.9.1**. `^7`로 고정해 Prisma 8을 피했다. Prisma 8은 2026-08-02 공개됐지만 **Early Access이며 GA가 아니다** |
| 4 | Prisma Neon driver adapter | `@prisma/adapter-neon` 사용. **URL 2개(pooled/direct) 구성은 유효하지만 두는 위치가 Prisma 7에서 완전히 바뀌었다** — 아래 「Prisma 7 실제 구성」 참조 |
| 5 | 부분 unique 인덱스 + migrate drift | **막힌다.** ③의 1순위안을 기각했다(아래) |
| 6 | Vercel × Neon Preview 브랜치 | Neon 네이티브 Vercel 통합이 **preview 배포마다 DB 브랜치를 자동 생성**하고 사용하지 않는 브랜치를 자동 삭제한다. ②의 미해결 1번 해소 |
| 7 | shadcn/ui + Tailwind | shadcn CLI가 **Tailwind v4를 지원**한다. `components.json`의 tailwind config 경로는 **빈 값으로 둔다** |
| 8 | 실제 설치된 버전 | Next `16.3.0`, React `19.2.8`, Tailwind `^4`, ESLint `^9`, Prisma `7.9.1`, **zod `^4`**(v3 아님), Recharts `^3`, react-hook-form `^7`, Vitest `^4`, Playwright `^1.62` |
| 9 | `AGENTS.md` 자동 생성 | `create-next-app`과 `next dev`가 `AGENTS.md`에 관리 블록을 넣는다. **`AGENTS.md`가 그 블록을 갖고 존재하는 동안 `CLAUDE.md`는 건드리지 않는다**(`node_modules/next/dist/server/lib/generate-agent-files.js` 확인). `AGENTS.md`를 지우면 하네스 `CLAUDE.md`가 덮어써질 수 있으므로 **커밋해서 유지한다** |

`AGENTS.md`의 내용도 유효한 경고다 — "이건 당신이 아는 Next.js가 아니다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 가이드를 읽어라." 실제로 이번 라운드에서 `next lint` 제거와 Prisma 7 config 변경 둘 다 기존 지식과 달랐다. 앱 코드를 쓸 때 이 지침을 따른다.

### 확인 결과가 바꾼 것 1 — lint를 빌드에서 분리

`next lint`가 없어졌고 `next build`가 lint를 돌리지 않는다. 따라서 실행 명령이 달라진다.

- `npm run lint`은 `eslint .`로 ESLint CLI를 직접 부른다. 설정은 `eslint.config.mjs`에 둔다.
- **`build`가 통과해도 lint·typecheck는 검증되지 않는다.** 두 명령을 별도로 돌려야 한다. ②의 미해결 2번(별도 CI 여부)이 더 중요해졌다 — Vercel 빌드만 믿으면 lint·타입 오류가 배포된다.

### 확인 결과가 바꾼 것 2 — 부분 unique 인덱스 기각, sentinel 채택

③에서 1순위로 둔 `WHERE deletedAt IS NULL` 부분 인덱스를 **기각한다.**

- Prisma는 `@@unique`/`@@index`에 `WHERE` 절을 지원하지 않아, 공식 권장 방법이 마이그레이션 SQL에 직접 넣는 것이었다.
- 그런데 Prisma 7.x는 스키마에 선언이 없는 그 인덱스를 **drift로 보고 `prisma migrate dev`마다 `DROP INDEX`를 생성한다.** 스키마 변경이 없어도 매번 발생한다. 7.4.0에서 보고됐고 7.2.0에도 존재하며, 마지막 정상 버전은 7.0.1이다. 이슈는 **열려 있고 우회책이 없다.**
- Prisma 8은 partial index를 스키마에서 직접 선언할 수 있게 해 이 문제를 없애지만, **Early Access라 "scope and behavior may still change"**로 명시되어 있다. 게다가 `@db.*` 네이티브 타입 속성이 제거되는 breaking change가 있어 우리 `Decimal @db.Decimal(5,2)`가 그대로 쓰이지 않는다.
- 결론: **Prisma 7.x(최신 7.7.0)에 고정하고, ③의 sentinel 대안을 채택한다.** 부분 인덱스를 쓰지 않으므로 drift 버그를 아예 만나지 않는다. 상세는 [server-action-contract.md](server-action-contract.md)의 「unique 제약 × 소프트 삭제」.
- Prisma 8이 GA가 되면 partial index + nullable `deletedAt`로 되돌리는 것을 재검토한다. 그때 `@db.*` 제거도 함께 처리한다.

### 확인 결과가 바꾼 것 3 — Preview 브랜치가 확보되므로 마이그레이션을 빌드에 넣을 수 있다

②에서 "Preview와 Production이 같은 DB를 보면 Preview 빌드가 Production 스키마를 바꾼다"며 보류했던 항목이다.

- Neon 네이티브 Vercel 통합이 preview 배포마다 **격리된 DB 브랜치**를 만들고 연결 문자열을 그 배포에만 주입한다. 브랜치는 copy-on-write라 부모 데이터·스키마 복사가 즉시 끝난다.
- 따라서 통합을 켠 뒤에는 빌드 단계에 `prisma migrate deploy`를 넣어도 Production을 건드리지 않는다.
- **전제**: 통합을 먼저 설치하고 브랜치 자동 생성·자동 삭제를 켠다. 통합 없이 마이그레이션을 빌드에 넣으면 안 된다.

## 출처

- [Next.js 16.3 릴리스](https://nextjs.org/blog/next-16-3) · [Next 16 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16) · [ESLint 설정](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Prisma 변경 로그](https://www.prisma.io/changelog) · [Prisma 8 Early Access 공지](https://www.prisma.io/changelog/2026-08-02) · [Neon adapter 문서](https://www.prisma.io/docs/orm/v6/overview/databases/neon) · [Neon: Connect from Prisma](https://neon.com/docs/guides/prisma)
- 부분 인덱스 drift: [prisma#29220](https://github.com/prisma/prisma/issues/29220) · [prisma#13417](https://github.com/prisma/prisma/issues/13417) · [prisma#29386](https://github.com/prisma/prisma/issues/29386)
- [Neon 네이티브 Vercel 통합](https://neon.com/blog/neon-vercel-native-integration) · [Neon-managed Vercel 통합 문서](https://neon.com/docs/guides/neon-managed-vercel-integration)
- [shadcn/ui Next.js 설치](https://ui.shadcn.com/docs/installation/next) · [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)

## 엣지케이스

- pooled URL로 마이그레이션 실행 → 실패한다. `DIRECT_URL` 누락이 가장 흔한 사고다. `.env.example`과 README에 두 URL의 차이를 명시한다.
- Server Action에서 zod 검증을 건너뛰면 클라이언트 검증만 남는다. 가중치 합 100%와 `targetCount ≥ 0`은 **`schema.ts` 한 곳**에서 검증하고 Server Action이 반드시 통과시킨다.
- `calc.ts`에 `Decimal` 타입을 흘리면 클라이언트 번들에 Prisma 런타임이 끌려온다. `calc.ts` 입력은 `number`로 받고, Prisma `Decimal` → `number` 변환은 `service.ts` 경계에서 한다.
- 목록 검색을 searchParams로 두면 새로고침·공유·뒤로가기가 자연히 동작한다. 대신 빈 값 처리를 통일해야 한다(빈 문자열과 미지정을 같게 본다).
- Vercel 서버리스는 요청 간 상태를 보장하지 않는다. Prisma client는 모듈 스코프 싱글턴으로 두고 요청마다 새로 만들지 않는다.

## 검증 기준

- 기능 검증
  - `npm run build`가 성공한다.
  - `npx prisma migrate dev`가 로컬에서 성공하고, Neon 콘솔에 두 테이블이 생성된다.
  - `npm run test`가 ①의 픽스처(상세 3행 → 종합 90.0%, 목록 10건 → 배지 5/3/2)를 통과한다.
  - `npm run test:e2e`가 등록→상세 플로우와 가중치 99% 저장 차단을 통과한다.
  - Vercel Preview 배포에서 목록·상세가 렌더링된다.
- 비기능 검증
  - `tsc --noEmit` 통과.
  - 클라이언트 번들에 Prisma가 포함되지 않는다(빌드 결과로 확인).
  - 커밋에 실제 연결 문자열이 없다(`.env`는 `.gitignore` 대상, `.env.example`만 커밋).

## Out of Scope

- Server Action 시그니처·입출력 타입·에러 표현 (③)
- 화면별 상호작용·유효성 메시지·접근성 (④)
- 인증/인가 (①의 미해결 5번)
- CI 파이프라인(GitHub Actions 등) — Vercel 빌드 외 별도 CI를 둘지는 미정
- 모니터링·로깅·에러 트래킹

## 미해결 질문

1. Vercel Preview 환경에 Neon 브랜치를 붙여 Production DB와 분리할 것인가? 분리 여부가 마이그레이션을 빌드에 넣을지를 결정한다.
2. 별도 CI(GitHub Actions)에서 `typecheck`/`test`를 돌릴 것인가, Vercel 빌드에만 의존할 것인가?
3. `.env` 로컬 개발에 Neon을 직접 붙일 것인가, 로컬 Postgres를 쓸 것인가?
4. ①의 미해결 1·3·4·5·6·7번은 여전히 열려 있다. 1(달성률 100% 초과)과 3(중복 등록)은 ③에서, 4·5·6·7은 ④에서 닫는다.
