/**
 * 환경변수 로딩.
 *
 * `.env`는 **저장소 루트에 하나만** 둔다. 앱마다 복사하면 값이 어긋난다.
 * cwd가 apps/api든 루트든 같은 파일을 읽도록 경로를 명시한다.
 *
 * 배포 환경(Vercel)에서는 플랫폼 환경변수가 주어지므로 파일이 없어도 된다.
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const here = dirname(fileURLToPath(import.meta.url))
const rootEnv = resolve(here, '../../../.env')

if (existsSync(rootEnv)) {
  config({ path: rootEnv })
}
