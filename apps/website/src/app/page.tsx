'use client'

import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import About from '@/components/About'
import ContactForm from '@/components/ContactForm'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <Hero />
      <Features />
      <About />
      <ContactForm />
      <Footer />
    </main>
  )
}
