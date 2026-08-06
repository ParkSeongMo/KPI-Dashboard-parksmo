# Skill Recommendations

작성일 2026-08-05 · 상태 **전 후보 보류**

이 문서는 프로젝트 전용 custom skill 후보와 보류 사유를 추적한다. 기본 7개 skill과 기본 권장 `skill-creator`는 이미 `.claude/skills/`에 있고 이 문서의 대상이 아니다.

## 왜 지금은 하나도 만들지 않았나

스택은 확정됐지만(`docs/design-reviews/stack-and-structure.md`) **애플리케이션 코드가 아직 0줄이다.** skill의 가치는 실행 가능한 절차와 측정 가능한 검증 기준에 있고, 그 둘이 스캐폴딩 결과(스크립트명, 설정 파일 위치, cwd)에 달려 있다. 지금 만들면 검증할 수 없는 명령이 박힌 skill이 남는다.

**생성 트리거**: `package.json`과 `prisma/schema.prisma`가 존재하고 `npm run build`가 한 번 성공한 시점. 그때 `/skill-craft`를 다시 돌린다.

## 검색 source

이번 라운드에서는 **외부 source를 조회하지 않았다.** 후보가 전부 이 프로젝트의 확정 설계에서 직접 도출된 것이고, 외부 skill 카탈로그와 비교할 단계가 아니다. 스캐폴딩 후 `/skill-craft`를 돌릴 때 기본 source(Anthropic `anthropics/skills`, VoltAgent `awesome-agent-skills`, SkillsMP, Awesome Skills, Agensi, `wshobson/agents`)를 확인한다.

## 보류 후보

### `kpi-calc-check` — 계산 규칙 회귀 점검

- 용도: 달성률·가중점수·종합 달성률·영역 비중·배지 구간이 확정 규칙과 어긋나지 않는지 점검한다.
- 근거: `docs/design-reviews/kpi-domain-model.md`의 계산식과 고정 픽스처(상세 시안 3행 → 종합 90.0%, 목록 10건 → 배지 5/3/2).
- 적용 가능성: 높다. 계산식이 프론트 미리보기와 서버 저장·조회 양쪽에서 쓰이고, 반올림 위치가 어긋나면 조용히 값이 틀린다.
- 위험도: 낮다(읽기·검증만).
- **보류 사유**: `lib/kpi/calc.ts`와 `tests/unit/calc.test.ts`가 아직 없어 점검 대상 경로와 테스트 명령을 확정할 수 없다. 스캐폴딩 후 Vitest 픽스처가 자리 잡으면 skill보다 테스트가 먼저다 — 테스트로 충분히 막히면 skill을 만들지 않을 수도 있다. 재검토 조건: 계산 관련 회귀가 2회 이상 발생.

### `prisma-neon-migration-check` — 마이그레이션 사전 점검

- 용도: `prisma migrate` 실행 전에 `DIRECT_URL`이 direct 엔드포인트를 가리키는지, pooled URL을 잘못 쓰고 있지 않은지, 미적용 마이그레이션이 있는지 확인한다.
- 근거: `stack-and-structure.md`의 「Neon 연결 — 두 개의 URL」. pooled URL로 마이그레이션을 돌리면 실패하는 것이 이 조합의 대표적 사고다.
- 적용 가능성: 높다. 스키마 변경마다 반복된다.
- 위험도: 중간. 잘못 만들면 실제 연결 문자열을 로그에 노출할 수 있다. 값이 아니라 **형태만** 검사하도록 써야 한다.
- **보류 사유**: `.env` 키 구성과 `schema.prisma`의 `directUrl` 설정이 아직 없다. Neon adapter의 현재 권장 설정을 Context7으로 확인하기 전이라 절차를 확정할 수 없다.

### `vercel-deploy-check` — 배포 전 점검

- 용도: `typecheck` → `lint` → `test` → `build` 순서를 돌리고, 커밋에 실제 연결 문자열이 없는지, 클라이언트 번들에 Prisma가 섞이지 않았는지 확인한다.
- 근거: `stack-and-structure.md`의 검증 기준.
- 적용 가능성: 중간. 배포마다 반복되지만 Vercel 빌드가 상당 부분을 이미 잡는다.
- 위험도: 낮다.
- **보류 사유**: 실행할 스크립트가 아직 없다. 별도 CI를 둘지도 미정(`stack-and-structure.md` 미해결 2번)이라 skill과 CI 중 어디에 둘지 정해지지 않았다.

### `screen-from-mockup` — 시안 기반 화면 구현 점검

- 용도: `docs/image/` 시안과 구현 화면의 필수/선택 필드, 라벨, 배지 색, 표 컬럼 순서가 일치하는지 점검한다.
- 근거: 시안 정독에서 실제로 놓치기 쉬운 지점이 이미 나왔다(팀·측정지표·목표치가 선택 필드, 배지가 양호/우려/미달 3단계, `목표치`는 계산에 쓰지 않는 표시용 텍스트).
- 적용 가능성: 중간. 화면이 4개뿐이라 반복 횟수가 적다.
- 위험도: 낮다.
- **보류 사유**: 반복 횟수가 4회로 적고, ④ 화면별 동작·검증 PDR이 같은 역할을 문서로 수행한다. 화면이 늘어나면 재검토한다.

## 채택

없음.

## 외부 source 사용 정책

외부 `SKILL.md` raw copy 금지. 채택 시 이 저장소 스타일(짧은 frontmatter + 사용 시점 + 사용하지 않는 경우 + 절차 + 검증 기준 + 출력 형식)로 재작성한다.
