import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let _ratelimit: Ratelimit | null = null

export function getRatelimit() {
  if (!_ratelimit) {
    const redis = Redis.fromEnv()
    _ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      analytics: true,
      prefix: "salurama_ratelimit",
    })
  }
  return _ratelimit
}

export const validateEmail = (email: string) => {
  const disposableDomains = [
    'mailinator.com', 'tempmail.com', '10minutemail.com',
    'guerrillamail.com', 'yopmail.com', 'trashmail.com'
  ]
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const domain = email.split('@')[1]?.toLowerCase()
  return {
    isValid: emailRegex.test(email),
    isDisposable: disposableDomains.includes(domain || ''),
    domain,
  }
}

export const validateMexicanPhone = (phone: string) => {
  const clean = phone.replace(/\D/g, '')
  return /^(\+?52)?1?\d{10}$/.test(clean)
}

export const detectAbuse = (data: {
  email: string
  phone: string
  userAgent: string
  timestamp: number
  formLoadTime: number
}) => {
  const risks: string[] = []
  if (/\d{5,}@/.test(data.email)) risks.push('email_numeric')
  if (data.formLoadTime < 3000) risks.push('too_fast')
  const ua = data.userAgent.toLowerCase()
  if (!ua || ua.includes('headless') || ua.includes('puppeteer')) {
    risks.push('bot_ua')
  }
  if (/(\d)\1{5,}/.test(data.phone.replace(/\D/g, ''))) {
    risks.push('phone_pattern')
  }
  return {
    isSuspicious: risks.length >= 2,
    riskScore: risks.length,
    risks,
  }
}

export async function verifyTurnstile(token: string, ip: string) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  })
  const data = await response.json()
  return data.success
}