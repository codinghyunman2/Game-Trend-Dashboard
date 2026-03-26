import { getEmailTransporter, getEmailRecipients } from '@/lib/emailClient'
import { buildBriefingEmailHtml, buildBriefingEmailText, BriefingEmailData } from '@/lib/emailTemplate'

export type { BriefingEmailData }

export async function sendEmailBriefing(data: BriefingEmailData): Promise<{ sent: number; errors: number }> {
  const fromAddress = process.env.GMAIL_USER
  if (!fromAddress) {
    console.error('[email/briefing] GMAIL_USER is not set — skipping email send')
    return { sent: 0, errors: 0 }
  }

  const recipients = getEmailRecipients()
  if (recipients.length === 0) {
    console.log('[email/briefing] EMAIL_RECIPIENTS 미설정 — 이메일 발송 건너뜀')
    return { sent: 0, errors: 0 }
  }

  const transporter = getEmailTransporter()
  const html = buildBriefingEmailHtml(data)
  const text = buildBriefingEmailText(data)
  const subject = `게임 트렌드 브리핑 — ${data.date}`

  let sent = 0
  let errors = 0

  for (const to of recipients) {
    try {
      await transporter.sendMail({
        from: `"rocket-brief" <${fromAddress}>`,
        to,
        subject,
        html,
        text,
      })
      sent++
    } catch (e) {
      console.error(`[email/briefing] 발송 실패 (${to}):`, e)
      errors++
    }
  }

  console.log(`[email/briefing] 발송 완료: ${sent}건, 실패: ${errors}건`)
  return { sent, errors }
}
