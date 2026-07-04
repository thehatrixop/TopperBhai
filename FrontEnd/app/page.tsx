'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { OwlSpeech, ComicActionButton, MangaPanel, SpeedLine } from '@/components/manga-ui'
import { 
  ChevronRight, 
  Sparkles, 
  Menu, 
  X, 
  Plus,
  Bot,
  Clock,
  ListTodo,
  Tv,
  FileText,
  Calendar
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
}

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

const renderGraphic = (graphic: string, color: string) => {
  switch (graphic) {
    case 'contours':
      return (
        <svg className="absolute bottom-0 right-0 w-36 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
          <path d="M40,100 C55,80 65,85 75,65 C85,45 80,25 100,15" stroke={color} strokeWidth="1.5" />
          <path d="M30,100 C48,72 55,78 68,55 C80,32 72,12 100,0" stroke={color} strokeWidth="1.5" />
          <path d="M20,100 C40,65 45,70 60,45 C75,20 65,0 100,-15" stroke={color} strokeWidth="1.5" strokeDasharray="3,3" />
          <path d="M10,100 C32,58 35,62 52,35 C68,8 58,-12 100,-30" stroke={color} strokeWidth="1" />
        </svg>
      )
    case 'dots':
      return (
        <svg className="absolute bottom-0 right-0 w-36 h-36 opacity-20 group-hover:opacity-55 transition-opacity duration-300 pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
          <path d="M10,100 Q30,50 50,75 T100,25" stroke={color} strokeWidth="2.5" strokeDasharray="1,6" strokeLinecap="round" />
          <path d="M0,100 Q20,40 40,65 T100,15" stroke={color} strokeWidth="2.5" strokeDasharray="1,6" strokeLinecap="round" />
          <path d="M-10,100 Q10,30 30,55 T100,5" stroke={color} strokeWidth="2.5" strokeDasharray="1,6" strokeLinecap="round" />
          <path d="M-20,100 Q0,20 20,45 T100,-5" stroke={color} strokeWidth="2" strokeDasharray="1,6" strokeLinecap="round" />
        </svg>
      )
    case 'chevrons':
      return (
        <svg className="absolute bottom-0 right-0 w-32 h-32 opacity-25 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
          <path d="M100,90 L70,60 L40,90" stroke={color} strokeWidth="3" fill="none" />
          <path d="M100,75 L70,45 L40,75" stroke={color} strokeWidth="3" fill="none" />
          <path d="M100,60 L70,30 L40,60" stroke={color} strokeWidth="3" fill="none" />
          <path d="M100,45 L70,15 L40,45" stroke={color} strokeWidth="2" fill="none" />
        </svg>
      )
    case 'bubbles':
      return (
        <svg className="absolute bottom-0 right-0 w-32 h-32 opacity-20 group-hover:opacity-55 transition-opacity duration-300 pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
          <circle cx="85" cy="85" r="9" fill={color} />
          <circle cx="62" cy="78" r="5" fill={color} />
          <circle cx="75" cy="52" r="7" fill={color} />
          <circle cx="90" cy="35" r="4" fill={color} />
          <circle cx="48" cy="62" r="3.5" fill={color} />
          <circle cx="38" cy="85" r="4.5" fill={color} />
        </svg>
      )
    case 'striped-circle':
      return (
        <svg className="absolute bottom-0 right-0 w-32 h-32 opacity-25 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
          <mask id="circleMask">
            <circle cx="100" cy="100" r="75" fill="white" />
          </mask>
          <g mask="url(#circleMask)">
            <path d="M25,100 L100,25 M35,100 L100,35 M45,100 L100,45 M55,100 L100,55 M65,100 L100,65 M75,100 L100,75 M85,100 L100,85 M95,100 L100,95" stroke={color} strokeWidth="4" />
          </g>
        </svg>
      )
    case 'ticks':
      return (
        <svg className="absolute bottom-0 right-0 w-32 h-32 opacity-25 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none z-0" viewBox="0 0 100 100" fill="none">
          <path d="M72,80 L76,68" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M82,62 L90,66" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M58,54 L48,58" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M85,82 L91,92" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M42,76 L48,66" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M62,88 L72,90" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M52,32 L58,42" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M35,50 L45,45" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Bot':
      return <Bot className="w-5 h-5 text-white" />
    case 'Clock':
      return <Clock className="w-5 h-5 text-white" />
    case 'ListTodo':
      return <ListTodo className="w-5 h-5 text-white" />
    case 'Tv':
      return <Tv className="w-5 h-5 text-white" />
    case 'FileText':
      return <FileText className="w-5 h-5 text-white" />
    case 'Calendar':
      return <Calendar className="w-5 h-5 text-white" />
    default:
      return null
  }
}

const FEATURES = [
  {
    id: 1,
    num: '01',
    title: 'Focus Dojo',
    description: 'Sharpen your concentration with intelligent Pomodoro timers, session tracking, and distraction-free study modes built for exam warriors.',
    badge: 'Focus Timer',
    link: '/features/focus-dojo',
    actionText: 'Enter Dojo',
    isEmpty: false,
    iconBg: '#00d9ff', // Cyan
    date: 'Active',
    role: 'Concentration Trainer',
    location: 'Focus Hall',
    icon: 'Clock',
    graphic: 'contours'
  },
  {
    id: 2,
    num: '02',
    title: 'Task Quest',
    description: 'Transform your syllabus into an epic quest. Organize topics, track daily missions, and gamify your revision to stay on top of every subject.',
    badge: 'Task Manager',
    link: '/features/task-quest',
    actionText: 'Start Quest',
    isEmpty: false,
    iconBg: '#22c55e', // Green
    date: 'Active',
    role: 'Quest Tracker',
    location: 'Quest Board',
    icon: 'ListTodo',
    graphic: 'dots'
  },
  {
    id: 3,
    num: '03',
    title: 'Scribe Dojo',
    description: 'Master grammar and writing. Rewrite drafts with real-time corrections, rule breakdowns, and AI grammar coaching.',
    badge: 'Grammar Coach',
    link: '/features/scribe-dojo',
    actionText: 'Enter Dojo',
    isEmpty: false,
    iconBg: '#eab308', // Yellow
    date: 'Active',
    role: 'Writing Coach',
    location: 'Scribe Hall',
    icon: 'FileText',
    graphic: 'chevrons'
  },
  {
    id: 4,
    num: '04',
    title: 'Concept Dojo',
    description: 'Master complex engineering concepts through AI-powered breakdowns, interactive explanations, and adaptive concept mapping tailored to your syllabus.',
    badge: 'Concept AI',
    link: '/features/concept-dojo',
    actionText: 'Enter Dojo',
    isEmpty: false,
    iconBg: '#3b82f6', // Blue
    date: 'Active',
    role: 'Concept Explainer',
    location: 'Concept Hall',
    icon: 'Tv',
    graphic: 'ticks'
  },
  {
    id: 5,
    num: '05',
    title: 'Grading Dojo',
    description: 'Master subjective exams. Submit handwritten answers with diagrams for instant vision-based grading, rubric breakdowns, and AI feedback.',
    badge: 'Vision Grader',
    link: '/features/grading-dojo',
    actionText: 'Enter Dojo',
    isEmpty: false,
    iconBg: '#ec4899', // Pink
    date: 'Active',
    role: 'Paper Evaluator',
    location: 'Grading Hall',
    icon: 'Bot',
    graphic: 'chevrons'
  },
  {
    id: 6,
    num: '06',
    title: 'Study Planner',
    description: 'Generate custom AI study roadmaps based on your exam targets and daily study hours. Download and track progress offline.',
    badge: 'Syllabus AI',
    link: '/features/study-planner',
    actionText: 'Build Plan',
    isEmpty: false,
    iconBg: '#a855f7', // Purple
    date: 'Active',
    role: 'Study Planner',
    location: 'Planner Dojo',
    icon: 'Calendar',
    graphic: 'bubbles'
  },
]

const getTranslationKeys = (id: number) => {
  switch (id) {
    case 1:
      return {
        title: 'nav.focus' as const,
        badge: 'hero.badge.focus' as const,
        desc: 'hero.desc.focus' as const
      }
    case 2:
      return {
        title: 'nav.tasks' as const,
        badge: 'hero.badge.tasks' as const,
        desc: 'hero.desc.tasks' as const
      }
    case 3:
      return {
        title: 'nav.scribe' as const,
        badge: 'hero.badge.scribe' as const,
        desc: 'hero.desc.scribe' as const
      }
    case 4:
      return {
        title: 'nav.concept' as const,
        badge: 'hero.badge.concept' as const,
        desc: 'hero.desc.concept' as const
      }
    case 5:
      return {
        title: 'nav.grading' as const,
        badge: 'hero.badge.grading' as const,
        desc: 'hero.desc.grading' as const
      }
    case 6:
      return {
        title: 'nav.planner' as const,
        badge: 'hero.badge.planner' as const,
        desc: 'hero.desc.planner' as const
      }
    default:
      return null
  }
}

export default function LandingPage() {
  const { language, setLanguage, t } = useLanguage()
  const [showSpeedLines, setShowSpeedLines] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleCTAClick = () => {
    setShowSpeedLines(true)
    setTimeout(() => {
      window.location.href = '/subjects'
    }, 600)
  }

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white overflow-hidden relative">
      {/* Decorative Manga Background Stickers/Grids at outer screen edges */}
      <div className="absolute left-4 top-[22%] -translate-y-1/2 pointer-events-none hidden 2xl:flex flex-col items-start opacity-10 select-none z-0">
        <span className="text-[120px] font-black text-topper-graphite leading-none tracking-tighter skew-x-[-12deg]">
          STUDY
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-topper-amber pl-4 mt-2">
          // TOPPER BHAI SYSTEM
        </span>
      </div>

      <div className="absolute right-4 top-[22%] -translate-y-1/2 pointer-events-none hidden 2xl:flex flex-col items-end opacity-10 select-none z-0">
        <span className="text-[120px] font-black text-topper-graphite leading-none tracking-tighter skew-x-[-12deg]">
          IGNITE
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-topper-cyan pr-4 mt-2">
          // LEVEL OVER 9000
        </span>
      </div>
      {/* Navigation */}
      <nav className="relative z-50 border-b border-topper-graphite/60 px-6 py-3.5 md:px-10 lg:px-16 flex items-center justify-between bg-topper-black/90 backdrop-blur-xl sticky top-0">
        <div className="flex-shrink-0">
          <Link href="/">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-black tracking-tight text-topper-off-white hover:text-topper-amber transition-colors duration-300 flex items-center gap-2.5 w-fit"
            >
              <div className="w-9 h-9 rounded-lg bg-topper-amber text-topper-black flex items-center justify-center font-black text-sm skew-x-[-6deg] shadow-[2px_2px_0_#2a2a2a,0_0_12px_rgba(245,166,35,0.25)] border border-topper-black">
                TB
              </div>
              <span className="hidden sm:inline">{t('subjects.back')}</span>
            </motion.div>
          </Link>
        </div>

        {/* Desktop Nav Links & Action Button */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center bg-topper-charcoal/50 rounded-full px-1.5 py-1 border border-topper-graphite/40">
            {[
              { name: t('nav.focus'), href: '/features/focus-dojo' },
              { name: t('nav.tasks'), href: '/features/task-quest' },
              { name: t('nav.scribe'), href: '/features/scribe-dojo' },
              { name: t('nav.grading'), href: '/features/grading-dojo' },
              { name: t('nav.concept'), href: '/features/concept-dojo' },
              { name: t('nav.planner'), href: '/features/study-planner' }
            ].map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-[13px] font-semibold text-topper-off-white/70 hover:text-topper-off-white hover:bg-topper-graphite/60 transition-all duration-200 px-4 py-1.5 rounded-full tracking-wide whitespace-nowrap"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="ml-2 flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="bg-topper-charcoal border border-topper-graphite/40 text-topper-off-white text-xs font-semibold rounded-full px-3 py-1.5 focus:outline-none focus:border-topper-amber/70 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
            <Link href="/subjects">
              <button className="relative py-2 px-5 bg-topper-amber text-topper-black font-bold text-[13px] tracking-wide rounded-full shadow-[0_0_16px_rgba(245,166,35,0.3)] hover:shadow-[0_0_24px_rgba(245,166,35,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer border border-topper-amber/80">
                {t('nav.start')}
              </button>
            </Link>
          </div>
        </div>

        {/* Mobile Hamburger Icon */}
        <div className="lg:hidden flex items-center ml-auto">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-topper-off-white/80 hover:text-topper-amber transition-colors focus:outline-none rounded-lg hover:bg-topper-charcoal/60"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Slide-down Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute top-full left-0 w-full bg-topper-charcoal/95 backdrop-blur-xl border-b border-topper-graphite/40 overflow-hidden z-40 lg:hidden shadow-2xl"
            >
              <div className="flex flex-col p-6 gap-1">
                {[
                  { name: t('nav.focus'), href: '/features/focus-dojo' },
                  { name: t('nav.tasks'), href: '/features/task-quest' },
                  { name: t('nav.scribe'), href: '/features/scribe-dojo' },
                  { name: t('nav.grading'), href: '/features/grading-dojo' },
                  { name: t('nav.concept'), href: '/features/concept-dojo' },
                  { name: t('nav.planner'), href: '/features/study-planner' }
                ].map((link, index) => (
                  <Link
                    key={index}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-[15px] font-semibold text-topper-off-white/80 hover:text-topper-amber hover:bg-topper-graphite/30 transition-all py-3 px-4 rounded-xl tracking-wide flex justify-between items-center"
                  >
                    <span>{link.name}</span>
                    <ChevronRight className="w-4 h-4 text-topper-graphite" />
                  </Link>
                ))}
                
                <div className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-topper-graphite/30">
                  <span className="text-[15px] font-semibold text-topper-off-white/80">Language / भाषा</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
                    className="bg-topper-black border border-topper-graphite/60 text-topper-off-white text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                  </select>
                </div>

                <div className="pt-3 mt-2 border-t border-topper-graphite/30">
                  <Link href="/subjects" onClick={() => setIsMobileMenuOpen(false)}>
                    <button className="w-full py-3 bg-topper-amber text-topper-black font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] active:translate-y-0 text-center tracking-wide">
                      {t('nav.start')}
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 xl:gap-20 items-center px-6 md:px-12 lg:px-16 py-12 md:py-20 max-w-7xl mx-auto w-full z-10">
        {/* Left: Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 md:max-w-[550px] justify-self-start w-full z-10"
        >
          {/* Speech bubble from owl */}
          <motion.div variants={itemVariants}>
            <OwlSpeech message={language === 'en' ? "Ready for today's challenge?" : "क्या आप आज की चुनौती के लिए तैयार हैं?"} delay={0.2} />
          </motion.div>

          {/* Main Headline */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter text-balance">
              {t('hero.title')}
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg text-topper-off-white/80 max-w-md leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={itemVariants} className="flex items-center gap-4 pt-4">
            <ComicActionButton onClick={handleCTAClick}>
              {language === 'en' ? 'Start Building' : 'अभ्यास शुरू करें'}
              <ChevronRight className="w-5 h-5" />
            </ComicActionButton>

            {/* Speed lines on click */}
            {showSpeedLines && (
              <div className="absolute inset-0 pointer-events-none">
                <SpeedLine duration={0.4} />
              </div>
            )}
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 text-sm text-topper-graphite pt-4"
          >
             <Sparkles className="w-4 h-4 text-topper-amber" />
            <span>{language === 'en' ? 'AI-powered. Fast. Reliable.' : 'AI-संचालित। तेज़। विश्वसनीय।'}</span>
          </motion.div>
        </motion.div>

        {/* Right: Owl Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative h-80 md:h-[360px] xl:h-[400px] flex items-center justify-center md:justify-end justify-self-end w-full z-10"
        >
          <div className="relative w-full h-full max-w-[280px] max-h-[280px] md:max-w-[320px] md:max-h-[320px] xl:max-w-[380px] xl:max-h-[380px]">
            <Image
              src="/topper-owl.png"
              alt="Topper Owl - Your Exam Preparation Guide"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />

            {/* Accent elements around owl */}
            <motion.div
              className="absolute -top-8 -right-8 w-24 h-24 border-2 border-topper-amber rounded-lg opacity-20"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute -bottom-12 -left-12 w-32 h-32 border-2 border-topper-cyan rounded-full opacity-10"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>

      {/* Feature Arsenal Section */}
      <section className="relative border-t-2 border-topper-graphite py-20 bg-topper-black/40">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 w-full">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-black tracking-tighter uppercase"
            >
              {language === 'hi' ? 'सुविधा शस्त्रागार' : 'Feature Arsenal'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-topper-graphite font-bold uppercase tracking-wider text-sm"
            >
              {language === 'hi' ? 'परीक्षा में विजय के लिए अपना हथियार चुनें' : 'Choose your weapon for exam conquest'}
            </motion.p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {FEATURES.map((item) => {
              const tKeys = getTranslationKeys(item.id)
              const title = tKeys ? t(tKeys.title) : item.title
              const badge = tKeys ? t(tKeys.badge) : item.badge
              const description = tKeys ? t(tKeys.desc) : item.description
              const actionText = item.id === 2 ? t('hero.action.quest') : t('hero.action.enter')

              return (
                <MangaPanel
                  key={item.id}
                  delay={item.id * 0.08}
                  className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.4rem)] group relative overflow-hidden bg-topper-charcoal/90 border-2 border-topper-graphite hover:border-topper-amber p-8 transition-all duration-300 rounded-2xl min-h-[350px] flex flex-col justify-between shadow-[4px_4px_0_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[8px_8px_0_rgba(0,0,0,1)]"
                >
                  {/* ID for navigation anchors */}
                  <div id={`feature-${item.id}`} className="absolute -top-24" />
                  
                  {/* Manga Blueprint Grid Texture background on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(#f5a623_1px,transparent_1px)] [background-size:16px_16px]" />
                  
                  {/* Dotted border outline inside */}
                  <div className="absolute inset-3.5 border border-dashed border-topper-graphite/40 group-hover:border-topper-amber/35 transition-colors pointer-events-none rounded-xl" />

                  {/* Card Top Row: Icon container on left, release date on right */}
                  <div className="flex justify-between items-start relative z-10 w-full">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-black/80 shadow-[2px_2px_0_rgba(0,0,0,1)] transition-transform group-hover:scale-105"
                      style={{ backgroundColor: item.iconBg }}
                    >
                      {getIcon(item.icon)}
                    </div>
                    <span className="text-[11px] font-bold text-topper-graphite uppercase tracking-wider select-none pt-1">
                      {item.id === 5 ? (language === 'en' ? 'New' : 'नया') : (language === 'en' ? 'Active' : 'सक्रिय')}
                    </span>
                  </div>

                  {/* Card Middle: Subtitle & Title */}
                  <div className="flex-1 flex flex-col justify-center mt-6 mb-8 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-topper-graphite select-none">
                      {badge}
                    </span>
                    <h3 className="text-2xl font-black tracking-tight text-topper-off-white group-hover:text-topper-amber transition-colors uppercase pt-1 leading-tight">
                      {title}
                    </h3>
                    <p className="text-sm text-topper-graphite group-hover:text-topper-off-white/75 transition-colors leading-relaxed mt-2.5 max-w-[85%]">
                      {description}
                    </p>
                  </div>

                  {/* Card Bottom Row: Category name / Location on left, SVG graphic or CTA button */}
                  <div className="flex justify-between items-end relative z-10 w-full mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-topper-graphite/50 select-none">
                        {language === 'en' ? 'Engine' : 'इंजन'}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-topper-graphite group-hover:text-topper-off-white/80 transition-colors select-none">
                        {item.id === 5 ? (language === 'en' ? 'Grader Room' : 'मूल्यांकन कक्ष') : item.location}
                      </span>
                    </div>
                    <Link href={item.link}>
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-topper-graphite group-hover:text-topper-amber transition-colors cursor-pointer border border-topper-graphite/40 group-hover:border-topper-amber px-3 py-1.5 rounded bg-topper-black/60 shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-y-0 active:translate-x-0">
                        {item.isEmpty ? <Plus className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 animate-pulse-glow" />}
                        <span>{actionText}</span>
                      </div>
                    </Link>
                  </div>

                  {/* Abstract graphic decoration at bottom-right corner */}
                  {renderGraphic(item.graphic, item.iconBg)}
                </MangaPanel>
              )
            })}
          </div>
        </div>
      </section>

      {/* Process Overview - Comic Strip Style */}
      <section className="relative border-t-2 border-topper-graphite mt-20 pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 w-full">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black mb-16 text-center"
          >
            {language === 'en' ? 'Your Practice Challenge Awaits' : 'आपकी अभ्यास चुनौती तैयार है'}
          </motion.h2>

          {/* Comic panels showing process */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { 
                title: language === 'en' ? 'Choose Subject' : 'विषय चुनें', 
                description: language === 'en' ? 'Select from DSA, Algorithms, OS, Databases, and more' : 'डीएसए, एल्गोरिदम, ओएस, डेटाबेस और अन्य में से चुनें', 
                icon: '1' 
              },
              { 
                title: language === 'en' ? 'Select Topics' : 'विषय-बिंदु चुनें', 
                description: language === 'en' ? 'Pick chapters you\'ve mastered' : 'उन अध्यायों को चुनें जिनमें आपकी महारत है', 
                icon: '2' 
              },
              { 
                title: language === 'en' ? 'Configure Difficulty' : 'कठिनाई सेट करें', 
                description: language === 'en' ? 'Set your challenge level' : 'अपना चुनौती स्तर निर्धारित करें', 
                icon: '3' 
              },
              { 
                title: language === 'en' ? 'Download PDF' : 'पीडीएफ डाउनलोड करें', 
                description: language === 'en' ? 'Instant practice papers & solutions' : 'तत्काल अभ्यास पत्र और समाधान प्राप्त करें', 
                icon: '4' 
              },
            ].map((panel, index) => (
              <MangaPanel key={index} delay={index * 0.15} className="p-6 bg-topper-charcoal">
                <div className="text-4xl mb-4 font-black text-topper-amber">{panel.icon}</div>
                <h3 className="text-xl font-bold mb-2">{panel.title}</h3>
                <p className="text-topper-off-white/70 text-sm">{panel.description}</p>
              </MangaPanel>
            ))}
          </div>

          {/* Connection lines visualization */}
          <div className="hidden md:block mt-16">
            <svg className="w-full h-24 opacity-20" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f5a623" />
                  <stop offset="100%" stopColor="#00d9ff" />
                </linearGradient>
              </defs>
              <path
                d="M 50 20 Q 250 5 450 20 T 850 20"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                fill="none"
              />
              {[0, 33, 66, 100].map((x) => (
                <circle
                  key={x}
                  cx={`${x}%`}
                  cy="20"
                  r="4"
                  fill="#f5a623"
                />
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative border-t-2 border-topper-graphite py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <OwlSpeech 
              message={language === 'hi' ? 'हर टॉपर सही तैयारी से शुरुआत करता है। आइए आपकी चुनौती का निर्माण करें।' : "Every topper starts with the right preparation. Let's build your challenge."} 
              position="left" 
            />

            <ComicActionButton onClick={handleCTAClick} className="w-full md:w-auto">
              {language === 'hi' ? 'अपना पहला पेपर शुरू करें' : 'Start Your First Paper'}
              <ChevronRight className="w-5 h-5" />
            </ComicActionButton>

            <p className="text-topper-graphite text-sm">
              {language === 'hi' ? 'किसी साइनअप की आवश्यकता नहीं है। तुरंत पेपर जनरेट करना शुरू करें।' : 'No signup required. Start generating papers instantly.'}
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
