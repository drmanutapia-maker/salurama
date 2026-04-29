import Link from 'next/link'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  href?: string
}

export default function Logo({ size = 'medium', href = '/' }: LogoProps) {
  const sizes = {
    small: { salu: 20, rama: 20 },
    medium: { salu: 24, rama: 24 },
    large: { salu: 48, rama: 48 }
  }

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <span 
        style={{ 
          fontFamily: "'Fraunces', serif", 
          fontSize: sizes[size].salu, 
          fontWeight: 900, 
          color: '#1E3A5F' 
        }}
      >
        Salu
      </span>
      <span 
        style={{ 
          fontFamily: "'Fraunces', serif", 
          fontSize: sizes[size].rama, 
          fontWeight: 600, 
          color: '#2A9D8F' 
        }}
      >
        rama
      </span>
    </Link>
  )
}