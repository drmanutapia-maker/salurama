import Link from 'next/link'
import { Calendar, Search, Clock, MapPin, Plus } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { Fraunces, DM_Sans } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700', '900'],
  variable: '--font-fraunces'
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm'
})

export const metadata = {
  title: 'Mis Citas | MediCitas',
  description: 'Gestiona tus citas médicas',
}

export default function CitasPage() {
  // TODO: Fetch real citas from Supabase
  const citas: any[] = []

  return (
    <div className={`${fraunces.variable} ${dmSans.variable} min-h-screen bg-[#F9FAFB] pb-24 font-sans`}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="font-fraunces text- font-bold tracking-tight text-[#1E3A5F]">
            Mis