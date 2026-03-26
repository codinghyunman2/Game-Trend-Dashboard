import { UpcomingGame } from '@/types/news'

export interface BriefingNewsItem {
  summary: string
  link: string
  source: string
}

export interface BriefingEmailData {
  date: string
  news: BriefingNewsItem[]
  adTrends: string[]
  upcomingGames?: UpcomingGame[]
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function buildBriefingEmailHtml(data: BriefingEmailData): string {
  const newsRows = data.news.map((n) => {
    const summary = esc(n.summary)
    const source = esc(n.source)
    const link = n.link && isValidHttpsUrl(n.link) ? n.link : null
    return `
      <tr>
        <td style="padding:6px 0;vertical-align:top;padding-right:8px;color:#e5384f;font-size:14px;">•</td>
        <td style="padding:6px 0;font-size:14px;line-height:1.6;color:#e0e0e0;">
          ${link ? `<a href="${esc(link)}" style="color:#e0e0e0;text-decoration:underline;">${summary}</a>` : summary}
          <span style="color:#888888;"> — ${source}</span>
        </td>
      </tr>`
  }).join('')

  const adRows = data.adTrends.map((t) => `
      <tr>
        <td style="padding:6px 0;vertical-align:top;padding-right:8px;color:#e5384f;font-size:14px;">•</td>
        <td style="padding:6px 0;font-size:14px;line-height:1.6;color:#e0e0e0;">${esc(t)}</td>
      </tr>`).join('')

  const upcomingSection = data.upcomingGames && data.upcomingGames.length > 0
    ? `
    <tr><td colspan="2" style="padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:24px 0 12px;">
            <span style="font-size:16px;font-weight:700;color:#ffffff;">🎮 신규 출시 예정</span>
          </td>
        </tr>
        ${data.upcomingGames.slice(0, 5).map((g) => {
          const name = esc(g.nameKo || g.name)
          const platform = g.platform.join('/')
          const date = g.releaseDateLabel ? ` · ${g.releaseDateLabel}` : ''
          const link = g.link && isValidHttpsUrl(g.link) ? g.link : null
          return `
        <tr>
          <td style="padding:6px 0;vertical-align:top;padding-right:8px;color:#e5384f;font-size:14px;">•</td>
          <td style="padding:6px 0;font-size:14px;line-height:1.6;color:#e0e0e0;">
            ${link ? `<a href="${esc(link)}" style="color:#e0e0e0;text-decoration:underline;">${name}</a>` : name}
            <span style="color:#888888;"> — ${esc(platform)}${esc(date)}</span>
          </td>
        </tr>`
        }).join('')}
      </table>
    </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>게임 트렌드 데일리 브리핑</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;">

          <!-- 헤더 -->
          <tr>
            <td style="background-color:#1a1a1a;border-radius:12px 12px 0 0;padding:24px 32px;border-bottom:1px solid #2a2a2a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">rocket-brief</span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#888888;">${esc(data.date)}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:6px;">
                    <span style="font-size:13px;color:#888888;letter-spacing:0.05em;">게임 트렌드 데일리 브리핑</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="background-color:#141414;padding:32px;border-radius:0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- 주요 뉴스 -->
                <tr>
                  <td style="padding-bottom:12px;">
                    <span style="font-size:16px;font-weight:700;color:#ffffff;">📰 오늘의 주요 뉴스</span>
                  </td>
                </tr>
                ${newsRows}

                <!-- 구분선 -->
                <tr><td style="padding:20px 0;"><hr style="border:none;border-top:1px solid #2a2a2a;"></td></tr>

                <!-- 광고 트렌드 -->
                <tr>
                  <td style="padding-bottom:12px;">
                    <span style="font-size:16px;font-weight:700;color:#ffffff;">🖥️ 광고 트렌드</span>
                  </td>
                </tr>
                ${adRows}

                <!-- 출시 예정 게임 (있을 때만) -->
                ${upcomingSection}

                <!-- 구분선 -->
                <tr><td style="padding:20px 0;"><hr style="border:none;border-top:1px solid #2a2a2a;"></td></tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <a href="https://rocket-brief.vercel.app/news"
                       style="display:inline-block;background-color:#e5384f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;">
                      전체 보기 →
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;">
                © rocket-brief
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildBriefingEmailText(data: BriefingEmailData): string {
  const lines: string[] = [
    `게임 트렌드 데일리 브리핑 — ${data.date}`,
    '━━━━━━━━━━━━━━━━',
    '',
    '📰 오늘의 주요 뉴스',
    ...data.news.map((n) => `• ${n.summary} — ${n.source}${n.link ? `\n  ${n.link}` : ''}`),
    '',
    '🖥️ 광고 트렌드',
    ...data.adTrends.map((t) => `• ${t}`),
  ]

  if (data.upcomingGames && data.upcomingGames.length > 0) {
    lines.push('', '🎮 신규 출시 예정')
    data.upcomingGames.slice(0, 5).forEach((g) => {
      const name = g.nameKo || g.name
      const platform = g.platform.join('/')
      const date = g.releaseDateLabel ? ` · ${g.releaseDateLabel}` : ''
      lines.push(`• ${name} — ${platform}${date}`)
    })
  }

  lines.push('', '전체 보기: https://rocket-brief.vercel.app/news')

  return lines.join('\n')
}
