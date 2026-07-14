'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { OwlSpeech, LoadingPanelSequence } from '@/components/manga-ui'
import { useLanguage } from '@/lib/LanguageContext'
import { API_BASE_URL } from '@/lib/config'

const generationSteps = [
  'Loading your selected topics...',
  'Downloading study materials from vault...',
  'Reading content with AI vision...',
  'Generating your question paper...',
  'Finalizing and verifying answers...',
]

const translateError = (error: string, lang: 'en' | 'hi') => {
  if (!error) return ''
  if (lang === 'hi') {
    if (error.includes("No PYQs from the last 5 years")) {
      return "डेटाबेस में पिछले 5 वर्षों (2021 से) का कोई पिछले वर्ष का प्रश्न (PYQ) नहीं मिला। कृपया डेटाबेस में प्रश्न जोड़ें।"
    }
    if (error.includes("Generation failed")) {
      return "पेपर जनरेशन विफल रहा।"
    }
    return error
  }
  return error
}

export default function GeneratingPage() {
  const params       = useParams()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const subjectId    = params.subjectId as string
  const topics       = searchParams.get('topics')?.split(',').filter(Boolean) || []
  const challenge    = searchParams.get('challenge') || 'rookie'
  const questions    = searchParams.get('questions') || '10'
  const includeNotes = searchParams.get('notes') !== 'false'
  const includeGenerated = searchParams.get('generated') !== 'false'
  const timeLimit    = searchParams.get('timeLimit') || 'none'
  const { language, setLanguage, t } = useLanguage()

  const localizedSteps = [
    t('generating.step1'),
    t('generating.step2'),
    t('generating.step3'),
    t('generating.step4'),
    t('generating.step5'),
  ]

  const [currentStep, setCurrentStep] = useState(-1)
  const [isComplete,  setIsComplete]  = useState(false)
  const [apiDone,     setApiDone]     = useState(false)
  const [apiError,    setApiError]    = useState<string | null>(null)

  // ── Timer-based step animation ──────────────────────────────────────────────
  useEffect(() => {
    if (currentStep < localizedSteps.length) {
      const delay = currentStep === -1 ? 600 : 2000 + currentStep * 400
      const timer = setTimeout(() => setCurrentStep(prev => prev + 1), delay)
      return () => clearTimeout(timer)
    }
  }, [currentStep, localizedSteps.length])

  // ── Mark complete when BOTH animation AND API are done, or immediately on API error ──────────────────────
  useEffect(() => {
    if ((currentStep >= localizedSteps.length && apiDone) || apiError) {
      const timer = setTimeout(() => setIsComplete(true), apiError ? 200 : 800)
      return () => clearTimeout(timer)
    }
  }, [currentStep, apiDone, apiError, localizedSteps.length])

  // ── API call ────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const generatePaper = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/generate-paper`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject_id:     subjectId,
            topics,
            challenge,
            question_count: Number(questions),
            include_notes:  includeNotes,
            include_generated_questions: includeGenerated,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || data.detail || 'Generation failed')
        }

        // Store the full paper in localStorage for the success page
        localStorage.setItem('paperData', JSON.stringify({
          questions:     data.questions || [],
          topics:        data.topics || topics,
          challenge,
          question_count: data.question_count,
          subject_id:    subjectId,
          timeLimit,
        }))

        console.log(`✅ Paper ready: ${data.question_count} questions generated`)
        setApiDone(true)
      } catch (error: any) {
        console.error('Generation Error:', error)
        setApiError(error.message || 'Something went wrong')
        setApiDone(true) // unblock the UI
      }
    }

    generatePaper()
  }, [])

  const handleViewPaper = () => {
    router.push(`/success/${subjectId}`)
  }

  // ── Rendering ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-topper-graphite px-6 py-4 md:px-12 flex items-center justify-between">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-bold tracking-tighter">
          {t('subjects.back')}
        </motion.div>
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
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-16">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {!isComplete ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Owl */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="flex justify-center mb-12"
                >
                  <div className="relative w-48 h-48 md:w-64 md:h-64">
                    <Image src="/topper-owl.png" alt="Topper Owl analyzing" fill className="object-contain drop-shadow-2xl" />
                    <motion.div
                      className="absolute -top-8 -right-8 w-6 h-6 bg-topper-amber rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                  </div>
                </motion.div>

                {/* Speech bubble */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-12 text-center">
                  <OwlSpeech
                    message={
                      currentStep === -1
                        ? t('generating.preparing')
                        : apiError
                        ? `⚠️ ${translateError(apiError, language)}`
                        : currentStep >= localizedSteps.length
                        ? t('generating.finishing')
                        : localizedSteps[currentStep]
                    }
                    position="left"
                  />
                </motion.div>

                {/* Steps */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mb-12">
                  <LoadingPanelSequence steps={localizedSteps} currentStep={currentStep} />
                </motion.div>

                {/* Dots */}
                <motion.div className="mt-12 flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                  <div className="flex gap-2">
                    {localizedSteps.map((_, index) => (
                      <motion.div
                        key={index}
                        className="w-2 h-2 rounded-full"
                        animate={{
                          backgroundColor: index <= currentStep ? '#f5a623' : '#2a2a2a',
                          scale: index === currentStep ? 1.5 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* API still running notice */}
                {currentStep >= localizedSteps.length && !apiDone && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-topper-off-white/50 text-sm mt-6"
                  >
                    {t('generating.stillCrafting')}
                  </motion.p>
                )}
              </motion.div>
            ) : (
              /* ── Complete state ── */
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-center space-y-8"
              >
                {/* Success Owl */}
                <div className="flex justify-center">
                  <div className="relative w-48 h-48 md:w-64 md:h-64">
                    <Image src="/topper-owl.png" alt="Paper ready" fill className="object-contain drop-shadow-2xl" />
                    <motion.div
                      className="absolute inset-0 border-4 border-topper-amber rounded-full"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 0 }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  </div>
                </div>

                <OwlSpeech
                  message={
                    apiError
                      ? (language === 'hi'
                          ? `मुझे समस्या आई: ${translateError(apiError, language)} क्या आप पुनः प्रयास करना चाहते हैं?`
                          : `I ran into trouble: ${translateError(apiError, language)}. Try again?`)
                      : t('generating.dossierReady')
                  }
                  position="left"
                />

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-3 gap-4 p-6 bg-topper-charcoal border-2 border-topper-graphite rounded"
                >
                  <div>
                    <p className="text-topper-graphite text-xs mb-2">{t('success.stats.questions')}</p>
                    <p className="text-2xl font-black text-topper-amber">{questions}</p>
                  </div>
                  <div>
                    <p className="text-topper-graphite text-xs mb-2">{t('success.stats.topics')}</p>
                    <p className="text-lg font-black text-topper-off-white">{topics.length}</p>
                  </div>
                  <div>
                    <p className="text-topper-graphite text-xs mb-2">{t('success.stats.difficulty')}</p>
                    <p className="text-lg font-black text-topper-amber capitalize">{t(`challenge.${challenge}` as any)}</p>
                  </div>
                </motion.div>

                {apiError ? (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => router.back()}
                    className="comic-action-btn mx-auto"
                  >
                    ← {t('generating.tryAgain')}
                  </motion.button>
                ) : (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleViewPaper}
                    className="comic-action-btn mx-auto"
                  >
                    {t('generating.viewDownload')}
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
