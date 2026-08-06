import type { MetadataRoute } from 'next'

/**
 * 전체 크롤링 차단.
 *
 * 데모 전제로 애플리케이션 인증이 없다(auth-demo-scope.md). 그 전제는
 * Deployment Protection + 검색 노출 차단 두 겹을 요구하는데, Hobby 플랜에서는
 * Production에 Vercel Authentication을 걸 수 없다. 남은 한 겹이라 반드시 둔다.
 *
 * layout.tsx의 `robots: { index: false, follow: false }` 메타와 짝이다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
