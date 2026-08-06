---
name: skill-craft
description: 프로젝트 스택과 반복 작업을 분석해 custom skill을 실제로 생성한다. 후보 기록만으로 끝나지 않고 .claude/skills/<name>/SKILL.md를 만든다.
disable-model-invocation: true
---

# skill-craft

이 skill은 프로젝트에 진짜로 필요한 custom skill을 골라서 만드는 데 쓴다.
"후보 추천"으로 끝나지 않는다. 채택된 skill은 실제 파일로 생성한다.
파일 생성/수정 workflow이므로 수동 호출 전용이다.

## 사용 시점

- 하네스 적용 단계에서 프로젝트 신호를 분석한 직후.
- 같은 작업이 두 번 이상 반복되어 절차가 굳어졌다(API 계약 검증, DB migration 점검, 릴리스, e2e 스모크 등).
- 외부에서 본 skill 아이디어를 이 프로젝트에 맞게 다시 짜야 한다.

## 사용하지 않는 경우

- 단순히 프론트엔드/백엔드가 있다는 이유만으로 domain skill을 만들고 싶을 때.
- 절차나 검증 기준이 아직 흐릿하다(먼저 `pdr` 또는 `docs-organize`로 정리한다).
- 한 번만 쓸 작업이다.

## 신호 추출

다음 신호를 근거로 후보를 도출한다.

- 언어, 프레임워크, 패키지 매니저
- 테스트/린트/빌드 도구와 명령
- API 계약(OpenAPI, GraphQL, gRPC, tRPC), DB migration, ORM, schema 관리
- 배포, 릴리스, 클라우드, 스토리지, CI/CD, 모니터링
- 기존 문서와 반복 작업 패턴
- 회귀가 자주 발생한 영역, 사람이 매번 손으로 점검하는 영역

## 후보 source

1. Anthropic `anthropics/skills` — https://github.com/anthropics/skills
2. VoltAgent `awesome-agent-skills` — https://github.com/VoltAgent/awesome-agent-skills
3. SkillsMP — https://skillsmp.com
4. Awesome Skills — https://awesomeskill.ai
5. Agensi
6. `wshobson/agents` — https://github.com/wshobson/agents

기본 source만으로 부족하면 프로젝트 스택과 반복 작업을 묶어 라이브 검색으로 확장한다. 검색 결과를 확인했을 때만 사용한다. Spring hexagonal 사례, 특정 Kotlin skill repo 같은 도메인 자료는 재검증 없이 공식 source로 단정하지 않는다.

## 후보 평가

후보별로 다음을 기록한다.

- skill 이름과 한 줄 용도
- 출처 URL 또는 문서 경로
- 적용 가능성(이 프로젝트에서 진짜 자주 쓸 일이 있는가)
- 위험도(잘못 동작했을 때 영향)
- 라이선스/복사 가능 여부
- 채택/보류 판단과 이유
- 채택 시 최종 생성 경로

## 채택 후 생성

채택한 skill은 외부 `SKILL.md`를 복사하지 않는다. 이 템플릿 스타일로 재작성한다.

```markdown
---
name: <skill-name>
description: <한 문장 — 언제 자동 호출될지 결정하는 정보다. 구체적으로 쓴다.>
disable-model-invocation: true   # 파일 생성/수정 workflow인 경우
---

# <skill-name>

## 사용 시점
- <이 skill이 적합한 상황>

## 사용하지 않는 경우
- <오용을 막을 상황>

## 절차
1. <구체적이고 실행 가능한 단계>
2. <검증 가능한 결과 산출>

## 검증 기준
- <명령, 출력, 조건>

## 출력 형식
- <사용자에게 보고할 형태>
```

생성 후 다음을 확인한다.

- frontmatter `name`, `description` 존재
- 파일 생성/수정 workflow면 `disable-model-invocation: true`
- 절차가 실행 가능하고 검증 기준이 측정 가능
- 기존 7개 기본 skill과 책임이 겹치지 않음

## 생성 안전 기준

- 생성 skill의 근거는 대상 프로젝트 파일, 기존 프로젝트 문서, 사용자가 제공한 기준, 실제 확인한 공개 공식 문서로 제한한다.
- 개인 memory, 이전 세션 기억, 전역 notes, 에이전트 내부 지식은 생성물의 출처나 근거로 쓰지 않는다.
- "공식", "확정", "불변 기준" 같은 표현은 실제 공식 문서나 프로젝트 SSOT로 확인한 경우에만 쓴다. 확인하지 못했으면 "프로젝트에서 확인한 규칙" 또는 "확인 필요"로 쓴다.
- 명령 예시는 대상 shell에서 문법상 실행 가능해야 한다. PowerShell에서 여러 확장자를 찾을 때 `-Filter` 하나에 쉼표로 여러 패턴을 넣지 말고 `-Include *.ts,*.tsx -File` 또는 `rg`를 쓴다.
- 상대 경로가 들어간 명령은 반드시 실행 위치(cwd)를 함께 적는다. 예: Prisma 명령은 실제 `schema.prisma`와 `migrations/`가 있는 모듈 디렉터리 기준으로 쓴다.
- 검증 명령을 실행하지 못했으면 PASS처럼 쓰지 말고 "미검증"으로 분리한다.

## 기록

`docs/skill-recommendations.md`는 기본 미생성이다.

다음 중 하나에 해당할 때만 만든다.

- 외부 skill 후보를 실제 비교했다.
- 프로젝트 전용 custom skill을 새로 채택/보류했고, 다음 세션에서도 근거 추적이 필요하다.

기본 7개 skill과 기본 권장 `skill-creator` 복사만 있는 경우에는 생성 조건이 아니다. 이 경우 사용자에게 묻지 않고 생략한다.

```markdown
# Skill Recommendations

## 검색 source
- <확인한 source 목록>

## 채택
- `<name>` — <이유, 최종 경로>

## 보류
- `<name>` — <이유, 재검토 조건>

## 외부 source 사용 정책
- raw copy 금지. 채택 skill은 본 템플릿 스타일로 재작성했다.
```

## 완료 기준

- 채택된 skill 파일이 `.claude/skills/<name>/SKILL.md`에 존재한다.
- frontmatter, 절차, 검증 기준, 출력 형식이 모두 있다.
- 근거, shell, cwd, 미검증 항목이 필요한 곳에 명시되어 있다.
- 외부 `SKILL.md` raw copy가 없다.
- 위 생성 조건에 해당하면 후보 평가 기록이 `docs/skill-recommendations.md`에 있다.
- 기록이 필요한 경우 `docs/README.md`에서 해당 문서를 연결한다.
