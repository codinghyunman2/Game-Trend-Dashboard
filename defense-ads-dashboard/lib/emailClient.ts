/**
 * Gmail SMTP 이메일 클라이언트
 *
 * 설정 방법:
 * 1. Google 계정 > 보안 > 2단계 인증 활성화
 * 2. Google 계정 > 보안 > 앱 비밀번호 생성 (앱: 메일, 기기: 기타)
 * 3. .env.local에 아래 환경변수 추가:
 *    GMAIL_USER=your-gmail@gmail.com
 *    GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  (앱 비밀번호 16자리)
 *    EMAIL_RECIPIENTS=email1@domain.com,email2@domain.com
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let _transporter: Transporter | null = null

export function getEmailTransporter(): Transporter {
  if (_transporter) return _transporter

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('[emailClient] GMAIL_USER 또는 GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다.')
  }

  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS (STARTTLS)
    auth: { user, pass },
  })

  return _transporter
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 수신자 목록을 환경변수에서 파싱합니다. 유효하지 않은 이메일 주소는 걸러냅니다. */
export function getEmailRecipients(): string[] {
  const raw = process.env.EMAIL_RECIPIENTS ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s))
}

/** SMTP 연결을 검증합니다. 테스트 용도. */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = getEmailTransporter()
    await transporter.verify()
    return true
  } catch (e) {
    console.error('[emailClient] SMTP 연결 실패:', e)
    return false
  }
}
