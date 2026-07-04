'use client'

import React, { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { OwlSpeech, ComicActionButton, MangaPanel } from '@/components/manga-ui'
import { ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

const challenges = [
  {
    id: 'rookie',
    name: 'Rookie Challenge',
    questions: 10,
    description: 'Perfect for warm-ups and concept review',
    difficulty: 'Easy',
    estimatedTime: '15 mins',
    icon: '🌱',
  },
  {
    id: 'practice',
    name: 'Practice Mission',
    questions: 20,
    description: 'Standard exam-like questions',
    difficulty: 'Medium',
    estimatedTime: '30 mins',
    icon: '⚔️',
  },
  {
    id: 'competitive',
    name: 'Competitive Mode',
    questions: 30,
    description: 'Advanced questions with multiple concepts',
    difficulty: 'Hard',
    estimatedTime: '45 mins',
    icon: '🏆',
  },
  {
    id: 'topper',
    name: 'Topper Mode',
    questions: 50,
    description: 'Full-length comprehensive challenge',
    difficulty: 'Expert',
    estimatedTime: '75 mins',
    icon: '👑',
  },
]

export default function DifficultyPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const subjectId = params.subjectId as string
  const topics = searchParams.get('topics')?.split(',') || []
  const includeNotes = searchParams.get('notes') !== 'false'
  const includePyqs = searchParams.get('pyqs') !== 'false'

  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  if (!topics || topics.length === 0) {
    const { language } = useLanguage()
    return (
      <div className="min-h-screen bg-topper-black text-topper-off-white flex items-center justify-center">
        <p>{language === 'hi' ? 'कोई विषय नहीं चुना गया। कृपया पीछे जाएं।' : 'No topics selected. Please go back.'}</p>
      </div>
    )
  }

  const { language, setLanguage, t } = useLanguage()

  const handleChallengeSelect = (challengeId: string) => {
    setSelectedChallenge(challengeId)
  }

  const handleGeneratePaper = () => {
    if (!selectedChallenge) return
    setIsGenerating(true)
    setTimeout(() => {
      const challenge = challenges.find((c) => c.id === selectedChallenge)
      router.push(
        `/generating/${subjectId}?topics=${topics.join(',')}&challenge=${selectedChallenge}&questions=${challenge?.questions}&notes=${includeNotes}&pyqs=${includePyqs}`
      )
    }, 300)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.2 },
    },
  }

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  }

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white overflow-hidden">
      {/* Navigation */}
      <nav className="border-b-2 border-topper-graphite px-6 py-4 md:px-12 flex items-center justify-between">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ x: 0 }}
          onClick={() => router.back()}
          className="text-2xl font-bold tracking-tighter hover:text-topper-amber transition-colors"
        >
          ← {t('difficulty.back')}
        </motion.button>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
            className="bg-topper-charcoal border border-topper-graphite/40 text-topper-off-white text-xs font-semibold rounded-full px-3 py-1.5 focus:outline-none focus:border-topper-amber/70 cursor-pointer"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
          </select>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16">
        {/* Owl Narrative */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <OwlSpeech message={t('difficulty.owl')} delay={0.1} />
        </motion.div>

        {/* Section Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-6xl font-black mb-4 tracking-tighter"
        >
          {t('difficulty.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-topper-off-white/70 text-lg mb-16"
        >
          {topics.length} {t('topics.selectedCount')} {t('difficulty.selectedCount')} {subjectId === 'computer-science-and-application' ? t('subjects.cs') : subjectId}
        </motion.p>

        {/* Challenge Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
        >
          {challenges.map((challenge, index) => (
            <motion.button
              key={challenge.id}
              variants={itemVariants}
              onClick={() => handleChallengeSelect(challenge.id)}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.95 }}
              className="relative group text-left"
            >
              {/* Selection Border */}
              {selectedChallenge === challenge.id && (
                <motion.div
                  layoutId="selectedBorder"
                  className="absolute inset-0 border-3 border-topper-amber rounded-lg"
                  transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                />
              )}

              <MangaPanel className="p-8 bg-gradient-to-br from-topper-charcoal to-topper-graphite h-full group-hover:from-topper-graphite group-hover:to-topper-charcoal transition-all duration-300">
                {/* Challenge Meter */}
                <div className="mb-6">
                  <div className="challenge-meter">
                    <motion.div
                      className="challenge-meter-fill"
                      initial={{ width: '0%' }}
                      animate={{ width: `${(index + 1) * 25}%` }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                    />
                  </div>
                </div>

                {/* Icon and Name */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                      {challenge.icon}
                    </div>
                    <h3 className="text-2xl font-black mb-1 group-hover:text-topper-amber transition-colors">
                      {t(`challenge.${challenge.id}` as any)}
                    </h3>
                    <p className="text-topper-graphite text-sm font-bold">
                      {t(`challenge.${challenge.difficulty.toLowerCase()}` as any)}
                    </p>
                  </div>
                </div>

                {/* Questions Count */}
                <div className="mb-4 p-3 bg-topper-black border-2 border-topper-graphite rounded">
                  <p className="text-topper-graphite text-xs mb-1">{t('success.stats.questions')}</p>
                  <p className="text-2xl font-black text-topper-amber">{challenge.questions}</p>
                </div>

                {/* Description */}
                <p className="text-topper-off-white/70 text-sm leading-relaxed mb-4">
                  {t(`challenge.${challenge.id}.desc` as any)}
                </p>

                {/* Time Estimate */}
                <div className="flex items-center gap-2 text-topper-off-white/60 text-xs">
                  <span>⏱</span>
                  <span>{t(`challenge.time.${challenge.id}` as any)}</span>
                </div>

                {/* Selection indicator */}
                {selectedChallenge === challenge.id && (
                  <motion.div
                    className="absolute top-4 right-4 w-6 h-6 rounded-full bg-topper-amber text-topper-black flex items-center justify-center font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    ✓
                  </motion.div>
                )}
              </MangaPanel>
            </motion.button>
          ))}
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col md:flex-row gap-4 items-center justify-between"
        >
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ x: 0 }}
            onClick={() => router.back()}
            className="px-6 py-3 text-topper-amber font-bold hover:text-topper-off-white transition-colors"
          >
            ← {t('difficulty.back')}
          </motion.button>

          <ComicActionButton
            onClick={handleGeneratePaper}
            disabled={!selectedChallenge || isGenerating}
            className={!selectedChallenge || isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {t('difficulty.generate')}
            <ChevronRight className="w-5 h-5" />
          </ComicActionButton>
        </motion.div>
      </div>
    </div>
  )
}
