# KPI-Dashboard-parksmo

이 파일은 Claude Code용 짧은 진입점이다. 프로젝트별 세부 지식은 기존 문서나 `docs/`에 두고, 이 파일에는 작업 진입 규칙과 문서 경로만 남긴다.

> 이 파일을 그대로 짧은 진입점으로 쓴다. 프로젝트 규칙 본문은 여기 복제하지 말고 SSOT 문서 경로만 인용한다.

## 프로젝트 상태

KPI 관리 대시보드다. 화면은 목록·등록·상세·수정 4개이며 시안이 `docs/image/`에 있다.

**데모 프로젝트다.** 애플리케이션 인증을 만들지 않는다. 접근 제한은 Vercel Deployment Protection으로 처리한다. **인물은 자유롭게 추가하되 평가 수치는 가상값을 쓴다.** 근거는 `docs/design-reviews/auth-demo-scope.md`.

2026-08-06 기준 **설계 6단계 확정 + 화면 4개 구현 완료 + 프론트/백엔드 분리 완료.**

**모노레포다.** `packages/core`(공유 순수 코드) · `apps/api`(Hono + Prisma, Neon에 접속하는 유일한 앱) · `apps/web`(Next.js, DB를 모른다). 브라우저는 web만 보고, web의 서버 계층이 api를 호출한다(BFF). 근거는 `docs/design-reviews/frontend-backend-split.md`.

검증: 단위 26개 / E2E 15개 통과.

- 스택 확정: Vercel 호스팅 + Neon Postgres + Next.js App Router(TypeScript) + Prisma + Tailwind/shadcn/ui + Recharts + Vitest/Playwright. 근거는 `docs/design-reviews/stack-and-structure.md`.
- 도메인 규칙 확정: 달성률·가중점수·종합 달성률 계산식, 배지 구간, 가중치 합 100% 저장 차단. 근거는 `docs/design-reviews/kpi-domain-model.md`.
- 의존성 확인 완료(2026-08-05): **Next.js 16.3**, **Prisma 7.x(7.7.0)**. Prisma 8은 Early Access이므로 쓰지 않는다. 근거·출처는 `stack-and-structure.md`의 「의존성 확인 결과」.

## 프로젝트 문서

- 기본 프로젝트 설명 → `README.md`
- 문서 라우터 → `docs/README.md`
- 화면 시안 → `docs/image/` (목록, 등록, 상세, 수정)
- **도메인 규칙·계산식 → `docs/design-reviews/kpi-domain-model.md`** (SSOT)
- **스택·디렉터리 구조·실행 명령 → `docs/design-reviews/stack-and-structure.md`** (SSOT)
- **모노레포 구조·API 계약·BFF → `docs/design-reviews/frontend-backend-split.md`** (SSOT)
- **Server Action 계약·검증 스키마·에러 코드 → `docs/design-reviews/server-action-contract.md`** (SSOT)
- **화면 동작·목록 정렬·빈 상태·접근성 → `docs/design-reviews/screen-behavior.md`** (SSOT)
- **인증 범위·데모 전제·배포 보호 → `docs/design-reviews/auth-demo-scope.md`** (SSOT)
- 설계 리뷰(PDR) 전체 → `docs/design-reviews/`
- 프로젝트 맵 → 아직 없음. 코드 도입 후 `/code-to-docs`로 만든다
- 리뷰 체크리스트 → 아직 없음. 리뷰 기준이 굳어진 뒤 `/docs-organize`로 만든다
- 아키텍처 메모 → 아직 없음. 코드 도입 후 `/code-to-docs`로 만든다
- 하네스 결정 → `.claude/notes/harness-decisions.md`
- skill 추천 결과 → `docs/skill-recommendations.md`

> 기존 `README`, `docs/`가 있으면 그 문서를 SSOT로 유지하고 여기서는 경로만 인용한다. 규칙 본문을 중복 복제하지 않는다.

## 작업 원칙

- 프로젝트에 이미 있는 규칙, 문체, 금지사항을 우선한다.
- 요청이 모호하면 구현/수정 전에 `/ask`로 필요한 질문만 좁히고 답을 기다린다.
- 비단순 작업은 구현 전에 `explorer`로 구조, 기존 문서, SSOT, 빌드/테스트 명령, 위험 지점을 먼저 요약한다.
- 신규 기능/화면/API/모듈 또는 큰 동작 변경 전에는 `/pdr`로 짧은 Product Design Review를 남긴다. 하네스 적용/설정/skill 선택/기본 예시 복사는 PDR 대상이 아니다.
- 반복 작업 절차가 굳어진 영역이 있으면 `/skill-craft`로 custom skill을 만든다.
- 기존 docs가 어지러우면 `/docs-organize`로 정리한다.
- 코드만 있고 문서가 비어 있으면 `/code-to-docs`로 문서를 만든다.
- 직접 실행/테스트로 검증하지 않은 내용은 검증 완료처럼 말하지 않는다.
- 영향 범위가 큰 변경은 먼저 사이드 이펙트를 설명한다.
- 요청 범위를 벗어난 리팩터링은 하지 않는다.
- 기존 스타일과 패턴을 맞추고 필요한 범위만 수정한다.

## Build / Test

shell zsh(macOS), cwd는 저장소 루트. 패키지 매니저는 **npm**.

전부 저장소 루트에서 실행한다. 워크스페이스로 위임된다.

| 명령 | 내용 |
|---|---|
| `npm run dev` | api(4000) + web(3000) 동시 실행 |
| `npm run dev:api` / `dev:web` | 하나만 실행 |
| `npm run build` | api(`prisma generate`) → web(`next build`) |
| `npm run typecheck` | 3개 워크스페이스 전부 |
| `npm run lint` | `eslint .` — `next lint`는 Next 16에서 제거됐다 |
| `npm run test` | 단위 테스트 (Vitest, `packages/core`) |
| `npm run test:e2e` | E2E (Playwright, 두 서버를 자동으로 띄운다) |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | `apps/api`로 위임 |

> 2026-08-06 기준 위 명령 전부 실제 통과했다.
>
> **`build`는 lint를 돌리지 않는다.** Next 16부터 `next build`에서 lint가 빠졌다. `lint`와 `typecheck`를 따로 실행해야 한다.
>
> **새 환경에서는 `prisma generate` → `next build` 순서가 먼저다.** 각각 `@prisma/client` 타입과 `.next/types`의 `LayoutProps`를 만든다. 이것 없이 `typecheck`만 돌리면 실패한다.
>
> **E2E는 실제 Neon DB를 쓴다.** `tests/e2e/global-setup.ts`가 지난 실행이 남긴 `e2e-*` 데이터를 먼저 지운다. 씨드 12건은 건드리지 않는다.

### 라이브러리 주의점

- **shadcn/ui는 Radix가 아니라 Base UI(`@base-ui/react`)를 쓴다.** `Button`에 `asChild`가 없고, `Select`의 `onValueChange`가 `null`을 넘길 수 있으며, `Select.Value`는 라벨을 자동 매핑하지 않는다. 상세는 `docs/design-reviews/stack-and-structure.md`.
- Base UI Select에서 "선택 없음"은 `undefined`가 아니라 **`null`**이다. `undefined`를 넘기면 uncontrolled→controlled 경고가 난다.
- 로컬 문서를 먼저 읽는다: `node_modules/next/dist/docs/`, `node_modules/@base-ui/react/docs/`. 기존 지식과 다른 부분이 실제로 여러 번 나왔다.
- `apps/web/app/globals.css`의 shadcn CSS import는 **상대 경로**다. Tailwind PostCSS 해석기가 호이스트된 패키지를 못 찾는다. 이유는 `frontend-backend-split.md`.

### Neon 연결 주의

`DATABASE_URL`은 pooled(`-pooler`) 엔드포인트, `DIRECT_URL`은 direct 엔드포인트다. pooled URL로 `prisma migrate`를 돌리면 실패한다. 실제 연결 문자열은 커밋하지 않고 `.env.example`에 키 이름만 둔다.

**`.env`는 저장소 루트에 하나만 둔다.** `apps/api`가 명시적 경로로 루트 `.env`를 읽는다. 앱마다 복사하면 값이 어긋난다.

## Agent 작업 흐름

```text
/ask (필요 시) → explorer → /pdr (필요 시) → /skill-craft (필요 시)
              → /docs-organize 또는 /code-to-docs (필요 시)
              → coder → reviewer → /verify → /handoff
```

1. 필요한 경우 `/ask`로 scope, 대상, 검증 기준을 먼저 잠근다.
2. 비단순 작업은 `explorer` 에이전트로 구조와 위험 지점을 요약한다.
3. 신규 기능·화면·API·큰 변경 전에 `/pdr`로 Product Design Review를 짧게 남긴다.
4. 반복 작업 절차가 굳어졌으면 `/skill-craft`로 custom skill을 생성한다.
5. 기존 docs 정리가 필요하면 `/docs-organize`, 코드만 있고 문서가 없으면 `/code-to-docs`.
6. `coder` 에이전트로 구현한다.
7. `reviewer` 에이전트로 검토한다.
8. 피드백이 있으면 다시 구현한다.
9. `/verify`로 완료 전 검증한다.
10. `/handoff`로 결과, 검증, 리스크, **다음 액션 후보**를 짧게 정리한다.

> 기본 agent는 `explorer`, `coder`, `reviewer` 3개다. 별도 `documenter`/`qa` agent를 두지 않는다. 문서 작업은 `/docs-organize`, `/code-to-docs` skill이 맡고, QA 관점은 `reviewer` 체크리스트에서 함께 확인한다.
> 세부 지침은 `.claude/agents/*.md`에 있다.

## Skills (8개)

기본 7개 + 선택 복사한 `skill-creator` 1개.

- `/ask` — 모호한 요청을 1~3개 질문으로 좁힌다. 파일 수정 없음.
- `/pdr` — **Product Design Review**: 신규 기능/화면/API/모듈 또는 큰 동작 변경 전에 목표·시나리오·제약·엣지케이스·검증 기준을 `docs/design-reviews/<slug>.md`에 짧게 남긴다. 하네스 적용/설정/skill 선택/기본 예시 복사는 대상이 아니다. 파일 생성 workflow — 수동 호출 전용.
- `/skill-craft` — 프로젝트 신호와 반복 작업을 근거로 custom skill을 실제 생성한다. 외부 SKILL.md raw copy 금지. 수동 호출 전용.
- `/docs-organize` — 기존 `docs/`와 README를 재배치·구조화하고 `docs/README.md` 라우터를 정비한다. 수동 호출 전용.
- `/code-to-docs` — 코드를 읽고 project-map·architecture·modules 문서를 만든다. 수동 호출 전용.
- `/verify` — JSON, frontmatter, 경로, stale 참조 등을 외부 패키지 없이 검증한다.
- `/handoff` — 결과·검증·리스크 + **다음 액션 후보**를 정리한다.
- `/skill-creator` — 만들 스킬이 이미 정해진 상태에서 목적·트리거·입력·출력·실수 패턴을 인터뷰해 `SKILL.md`를 작성한다. 수동 호출 전용.

> `/skill-craft`와 `/skill-creator`는 다르다. `/skill-craft`는 프로젝트 신호에서 **후보를 도출**해 만들고, `/skill-creator`는 만들 스킬이 이미 정해진 뒤 **작성 품질**을 잡는다.

## Context7 MCP

- Context7은 라이브러리/API 최신 문서 조회용 기본 MCP로 루트 `.mcp.json`에 있다. **유지** 결정.
- 2026-08-05 확인: `node` v24.5.0, `npm` 11.5.1, `npx` 11.5.1 — 실행 전제 충족.
- 라이브러리 사용법, 코드 생성, 설정 절차, 버전별 API 확인에는 Context7을 우선 사용한다.
- 프로젝트 내부 규칙, 도메인 정책, 로컬 DB/배포 사실은 기존 SSOT와 실제 코드를 우선한다.
- 저장소에 평문 API key를 넣지 않는다. 높은 rate limit이 필요하면 개인 환경에서 설정한다.
- 세부 기준은 `.claude/notes/context7-mcp.md`.

## Hooks / MCP / 호환성

- hooks는 두지 않는다. 필요해지면 결정을 먼저 남긴다.
- Context7 외 MCP는 실제 서버 정의와 자격증명이 확인되기 전까지 추가하지 않는다.
- 미지원 자동화는 `.claude/notes/`에 짧게 기록한다.
- 하네스 자체 변경 결정은 `.claude/notes/harness-decisions.md`에 남긴다. PDR(`/pdr`)과 혼동하지 않는다.
