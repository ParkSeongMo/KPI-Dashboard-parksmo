import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const here = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  /**
   * 모노레포 루트를 명시한다.
   *
   * 지정하지 않으면 Turbopack이 apps/web을 루트로 보고 저장소 루트의
   * node_modules를 찾지 못한다. globals.css의 `@import "shadcn/tailwind.css"`가
   * 여기서 깨진다.
   */
  turbopack: {
    root: path.resolve(here, '../..'),
  },
}

export default nextConfig
