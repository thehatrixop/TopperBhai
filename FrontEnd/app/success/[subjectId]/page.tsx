'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ChevronRight, CheckCircle, XCircle, Clock, Menu, X } from 'lucide-react'
import QuestionChat from '@/components/QuestionChat'
import { useLanguage } from '@/lib/LanguageContext'

interface Option {
  A: string
  B: string
  C: string
  D: string
}

interface Question {
  id: number
  topic: string
  type?: 'mcq' | 'msq' | 'fitb' | 'assertion_reason' | 'matching'
  question: string
  options?: Option
  correct_answer: string
  explanation: string
  assertion?: string
  reason?: string
  list_i?: Record<string, string>
  list_ii?: Record<string, string>
}

function parseQuestionText(text: string) {
  if (!text) return { cleanText: '', imageUrl: null }
  
  // 1. Try matching markdown image syntax first: ![anything]\s*(url)
  const markdownMatch = text.match(/!\[.*?\]\s*\(\s*(https?:\/\/.*?)\s*\)/)
  if (markdownMatch) {
    const imageUrl = markdownMatch[1].trim()
    const cleanText = text.replace(markdownMatch[0], '').trim()
    return { cleanText, imageUrl }
  }
  
  // 2. Try matching plain parenthesized image URL: (url ending in png/jpg/jpeg)
  const parenMatch = text.match(/\(\s*(https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp)(?:\?.*?)?)\s*\)/i)
  if (parenMatch) {
    const imageUrl = parenMatch[1].trim()
    const cleanText = text.replace(parenMatch[0], '').trim()
    return { cleanText, imageUrl }
  }

  // 3. Try matching raw image URL
  const rawUrlMatch = text.match(/(https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp)(?:\?.*?)?)/i)
  if (rawUrlMatch) {
    const imageUrl = rawUrlMatch[1].trim()
    const cleanText = text.replace(rawUrlMatch[0], '').trim()
    return { cleanText, imageUrl }
  }
  
  return { cleanText: text, imageUrl: null }
}

interface PaperData {
  questions: Question[]
  topics: string[]
  challenge: string
  question_count: number
  subject_id: string
  timeLimit?: string
}

const CHALLENGE_LABELS: Record<string, string> = {
  rookie:      'Rookie — Easy',
  practice:    'Practice — Medium',
  competitive: 'Competitive — Hard',
  topper:      'Topper — Expert',
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

export default function SuccessPage() {
  const router = useRouter()
  const params = useParams()
  const subjectId = params.subjectId as string
  const { language, setLanguage, t } = useLanguage()
  const [paper, setPaper]               = useState<PaperData | null>(null)
  const [showAnswers, setShowAnswers]   = useState(false)
  const [expandedId, setExpandedId]     = useState<number | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [tempSelections, setTempSelections]   = useState<Record<number, string[]>>({})
  const [tempFitbInputs, setTempFitbInputs]   = useState<Record<number, string>>({})
  const [isChallengeStarted, setIsChallengeStarted] = useState(false)
  const [timeRemaining, setTimeRemaining]           = useState<number>(0)
  const [timerActive, setTimerActive]   = useState(false)
  const [isSubmitted, setIsSubmitted]   = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Single-question timer states
  const [activeQuestionTime, setActiveQuestionTime] = useState<number>(0)
  const [activeQuestionTimerRunning, setActiveQuestionTimerRunning] = useState<boolean>(false)
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({})

  // Tick hook for active question timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (activeQuestionTimerRunning) {
      interval = setInterval(() => {
        setActiveQuestionTime(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeQuestionTimerRunning])



  const totalQuestions = paper?.questions.length || 0
  const answeredCount = Object.keys(selectedAnswers).length

  const isTimeLimitEnabled = paper?.timeLimit && paper.timeLimit !== 'none'
  const totalLimit = isTimeLimitEnabled ? Number(paper.timeLimit) : 0
  const isSubmitEnabled = !isTimeLimitEnabled || (timeRemaining <= totalLimit * 0.8)

  const getSubmitWaitTimeText = () => {
    if (!isTimeLimitEnabled) return ''
    const requiredSeconds = Math.ceil(totalLimit * 0.2)
    const elapsedSeconds = totalLimit - timeRemaining
    const waitSecs = requiredSeconds - elapsedSeconds
    if (waitSecs <= 0) return ''
    
    if (waitSecs < 60) {
      return language === 'hi' 
        ? `जमा करने के लिए ${waitSecs}s प्रतीक्षा करें` 
        : `Wait ${waitSecs}s to submit`
    } else {
      const mins = Math.ceil(waitSecs / 60)
      return language === 'hi'
        ? `जमा करने के लिए ${mins}m प्रतीक्षा करें`
        : `Wait ${mins}m to submit`
    }
  }

  useEffect(() => {
    if (totalQuestions > 0 && answeredCount === totalQuestions) {
      setTimerActive(false)
    }
  }, [answeredCount, totalQuestions])

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getScore = () => {
    let correct = 0
    let incorrect = 0
    let unattempted = 0
    
    paper?.questions.forEach(q => {
      const ans = selectedAnswers[q.id]
      if (!ans) {
        unattempted++
      } else if (ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
        correct++
      } else {
        incorrect++
      }
    })
    
    return { correct, incorrect, unattempted }
  }

  const handleSelectOption = (questionId: number, optionKey: string) => {
    if (showAnswers || selectedAnswers[questionId]) return
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }))

    // Stop active question timer and save the elapsed duration
    if (expandedId === questionId) {
      setActiveQuestionTimerRunning(false)
      setQuestionTimes(prev => ({
        ...prev,
        [questionId]: activeQuestionTime
      }))
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem('paperData')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        setPaper(parsed)
        if (parsed.timeLimit && parsed.timeLimit !== 'none') {
          setTimeRemaining(Number(parsed.timeLimit))
          setIsChallengeStarted(false)
          setTimerActive(false)
        } else {
          setIsChallengeStarted(true)
          setTimerActive(true)
        }
      } catch {
        console.error('Failed to parse paper data')
      }
    }
  }, [])

  // Timer challenge countdown countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (timerActive && isChallengeStarted && paper?.timeLimit && paper.timeLimit !== 'none') {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (interval) clearInterval(interval)
            setTimerActive(false)
            setIsSubmitted(true)
            setShowAnswers(true) // Auto-submit
            alert(language === 'hi' ? 'समय समाप्त! आपका अभ्यास पत्र स्वतः जमा कर दिया गया है।' : "Time's up! Your practice paper has been auto-submitted.")
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerActive, isChallengeStarted, paper?.timeLimit, language])

  const handlePrint = () => {
    window.print()
  }

  const handleNewPaper = () => {
    localStorage.removeItem('paperData')
    router.push('/subjects')
  }

  if (!paper || paper.questions.length === 0) {
    return (
      <div className="min-h-screen bg-topper-black text-topper-off-white flex flex-col items-center justify-center gap-6">
        <p className="text-xl font-bold text-topper-graphite">No paper data found.</p>
        <button
          onClick={() => router.push('/subjects')}
          className="px-6 py-3 bg-topper-amber text-topper-black font-bold rounded"
        >
          Generate a Paper
        </button>
      </div>
    )
  }

  const totalActiveSolveTime = Object.entries(questionTimes).reduce((sum, [id, val]) => {
    if (expandedId !== null && Number(id) === expandedId && !selectedAnswers[expandedId]) {
      return sum
    }
    return sum + val
  }, 0) + (expandedId !== null && !selectedAnswers[expandedId] ? activeQuestionTime : 0)

  const typeCounts = paper.questions.reduce((acc, q) => {
    const qType = q.type || 'mcq'
    acc[qType] = (acc[qType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      {/* ── Print styles (hidden on screen, visible on print) ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          .question-card {
            border: 1px solid #ccc !important;
            background: white !important;
            break-inside: avoid;
            margin-bottom: 16px !important;
          }
          .answer-key { display: block !important; }
        }
        @media screen {
          .print-only { display: none; }
          .answer-key { display: none; }
        }
      `}</style>

      <div className="min-h-screen bg-topper-black text-topper-off-white font-sans">
        
        {/* ── Top bar ── */}
        <nav className="no-print border-b-2 border-topper-graphite px-6 py-4 md:px-12 flex items-center justify-between bg-topper-black z-10 relative">
          <Link href="/">
            <span className="text-2xl font-black tracking-tighter hover:text-topper-amber transition-colors cursor-pointer select-none">{t('subjects.back')}</span>
          </Link>
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="bg-topper-charcoal border border-topper-graphite/40 text-topper-off-white text-xs font-semibold rounded-md px-3 py-1.5 focus:outline-none focus:border-topper-amber/70 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>

            {!isSubmitted && (isChallengeStarted || !(paper.timeLimit && paper.timeLimit !== 'none')) && (
              <div className="flex flex-col items-end">
                <motion.button
                  whileHover={isSubmitEnabled ? { scale: 1.05 } : {}}
                  whileTap={isSubmitEnabled ? { scale: 0.95 } : {}}
                  onClick={() => {
                    if (isSubmitEnabled) {
                      setShowSubmitModal(true)
                    }
                  }}
                  disabled={!isSubmitEnabled}
                  className="px-4 py-2 bg-topper-amber text-topper-black font-black border-2 border-topper-amber hover:bg-white hover:border-white rounded-md text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-topper-amber disabled:hover:border-topper-amber"
                >
                  {language === 'hi' ? 'परीक्षा जमा करें' : 'Submit Test'}
                </motion.button>
                {!isSubmitEnabled && (
                  <span className="text-[10px] text-red-400 font-bold mt-1 animate-pulse">
                    {getSubmitWaitTimeText()}
                  </span>
                )}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-topper-amber text-topper-black font-bold border-2 border-topper-amber rounded-md text-sm"
            >
              <Download className="w-4 h-4" />
              {t('success.printDownload')}
            </motion.button>

            {/* Hamburger Menu Option */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-topper-off-white hover:text-topper-amber border-2 border-topper-graphite hover:border-topper-amber rounded-md transition-all cursor-pointer flex items-center justify-center bg-topper-charcoal"
                aria-label="Toggle features menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-64 bg-[#121212] border-2 border-topper-graphite rounded-lg shadow-[8px_8px_0_rgba(0,0,0,1)] z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-topper-graphite/40">
                      <p className="text-[10px] font-black uppercase tracking-widest text-topper-amber">
                        {language === 'hi' ? 'नेविगेशन' : 'Navigation Menu'}
                      </p>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link
                        href="/"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-topper-graphite/40 text-topper-off-white hover:text-topper-amber text-sm font-bold tracking-wide transition-colors"
                      >
                        <span className="text-base">🏠</span>
                        <span>{language === 'hi' ? 'मुख्य पृष्ठ' : 'Home'}</span>
                      </Link>
                      {[
                        { name: t('nav.focus'), href: '/features/focus-dojo', icon: '⏱' },
                        { name: t('nav.tasks'), href: '/features/task-quest', icon: '⚔️' },
                        { name: t('nav.scribe'), href: '/features/scribe-dojo', icon: '✍️' },
                        { name: t('nav.grading'), href: '/features/grading-dojo', icon: '🔎' },
                        { name: t('nav.concept'), href: '/features/concept-dojo', icon: '💡' },
                        { name: t('nav.planner'), href: '/features/study-planner', icon: '📅' }
                      ].map((item, idx) => (
                        <Link
                          key={idx}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-topper-graphite/40 text-topper-off-white hover:text-topper-amber text-sm font-bold tracking-wide transition-colors"
                        >
                          <span className="text-base">{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10 text-left border-b-2 border-topper-graphite pb-8 relative"
          >
            {/* Print header */}
            <div className="print-only mb-6 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-black">{language === 'hi' ? 'टॉपरभाई — अभ्यास पत्र' : 'TopperBhai — Practice Paper'}</h1>
              <p>{language === 'hi' ? 'विषय' : 'Topics'}: {paper.topics.join(', ')} | {language === 'hi' ? 'कठिनाई' : 'Difficulty'}: {t(`success.stats.${paper.challenge}` as any) || paper.challenge}</p>
            </div>

            {/* Screen header */}
            <div className="no-print">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="w-16 h-16 bg-topper-amber rounded-full flex items-center justify-center text-topper-black text-3xl font-black mb-6"
              >
                ✓
              </motion.div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
                {language === 'hi' ? 'पेपर तैयार है!' : 'Paper Ready!'}
              </h1>

              {/* Stats / Results Panel */}
              <div className="mb-8 p-6 bg-topper-charcoal border-2 border-topper-graphite rounded flex flex-col gap-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-topper-graphite text-xs mb-1">{t('success.stats.questions')}</p>
                    <p className="text-3xl font-black text-topper-amber">{paper.questions.length}</p>
                  </div>
                  <div>
                    <p className="text-topper-graphite text-xs mb-1">{t('success.stats.topics')}</p>
                    <p className="text-sm font-bold text-topper-off-white leading-tight">{paper.topics.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-topper-graphite text-xs mb-1">{t('success.stats.difficulty')}</p>
                    <p className="text-sm font-black text-topper-amber capitalize">
                      {t(`success.stats.${paper.challenge}` as any) || paper.challenge}
                    </p>
                  </div>
                  <div>
                    <p className="text-topper-graphite text-xs mb-1">
                      {paper.timeLimit && paper.timeLimit !== 'none'
                        ? (language === 'hi' ? 'शेष समय' : 'TIME REMAINING')
                        : (language === 'hi' ? 'लिया गया समय' : 'TIME TAKEN')
                      }
                    </p>
                    <p className={`text-3xl font-black font-mono transition-colors ${
                      paper.timeLimit && paper.timeLimit !== 'none'
                        ? timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-topper-amber'
                        : activeQuestionTimerRunning ? 'text-topper-amber animate-pulse' : 'text-topper-off-white'
                    }`}>
                      {paper.timeLimit && paper.timeLimit !== 'none'
                        ? formatElapsed(timeRemaining)
                        : formatElapsed(totalActiveSolveTime)
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Questions or Start Challenge Splash ── */}
          {!isChallengeStarted && paper.timeLimit && paper.timeLimit !== 'none' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 md:p-12 bg-gradient-to-br from-topper-charcoal to-topper-graphite border-2 border-topper-graphite rounded-lg text-center shadow-[4px_4px_0_rgba(0,0,0,1)] relative overflow-hidden"
            >
              {/* Premium comic/manga design element */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-topper-amber text-topper-black flex items-center justify-center font-black text-xs uppercase rotate-45 translate-x-8 -translate-y-8 tracking-widest shadow border-l border-b border-topper-black">
                Timed!
              </div>

              <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500 text-red-500 rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-6 animate-pulse">
                ⏱
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-tighter text-topper-off-white">
                {language === 'hi' ? 'समयबद्ध चुनौती सक्रिय!' : 'Timer Challenge Active!'}
              </h2>
              <p className="text-topper-off-white/70 max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
                {language === 'hi'
                  ? `यह अभ्यास पत्र ${Math.round(Number(paper.timeLimit) / 60)} मिनट की समय सीमा के साथ सेट किया गया है। एक बार शुरू होने पर, घड़ी उलटी चलेगी और समय पूरा होने पर पेपर अपने आप जमा हो जाएगा।`
                  : `This practice paper is set with a time limit of ${Math.round(Number(paper.timeLimit) / 60)} minutes. Once started, the countdown will begin and the paper will auto-submit when the timer hits zero.`}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsChallengeStarted(true)
                  setTimerActive(true)
                }}
                className="px-8 py-4 bg-topper-amber text-topper-black font-black text-lg border-2 border-topper-black rounded shadow-[4px_4px_0_rgba(0,0,0,1)] transition-transform inline-flex items-center gap-2 cursor-pointer"
              >
                {language === 'hi' ? 'चुनौती शुरू करें' : 'Start Challenge'}
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {paper.questions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 1) }}
                  className="question-card bg-[#121212] border-2 border-topper-graphite rounded-lg overflow-hidden shadow-md"
                >
                  {/* Question header */}
                  <div
                    className="p-5 cursor-pointer no-print"
                    onClick={() => {
                      const targetId = q.id
                      if (expandedId === targetId) {
                        setExpandedId(null)
                        setActiveQuestionTimerRunning(false)
                        // Save accumulated time when collapsing
                        if (!selectedAnswers[targetId]) {
                          setQuestionTimes(prev => ({
                            ...prev,
                            [targetId]: activeQuestionTime
                          }))
                        }
                      } else {
                        // Save progress of the previous active question before switching
                        if (expandedId !== null && !selectedAnswers[expandedId]) {
                          const prevId = expandedId
                          const prevTime = activeQuestionTime
                          setQuestionTimes(prev => ({
                            ...prev,
                            [prevId]: prevTime
                          }))
                        }
                        
                        setExpandedId(targetId)
                        if (!selectedAnswers[targetId]) {
                          // Resume from previously accumulated time if present, else 0
                          setActiveQuestionTime(questionTimes[targetId] || 0)
                          setActiveQuestionTimerRunning(true)
                        } else {
                          setActiveQuestionTimerRunning(false)
                        }
                      }
                    }}
                  >
                    <div className="flex items-start gap-4 justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <span className={`flex-shrink-0 w-8 h-8 rounded-md font-black text-sm flex items-center justify-center transition-all ${
                          selectedAnswers[q.id]
                            ? 'bg-topper-amber text-topper-black border-2 border-topper-amber'
                            : 'bg-[#181818] text-[#a0a0a0] border-2 border-topper-graphite'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs text-topper-graphite mb-1 uppercase tracking-wider">
                            {q.topic}
                            {q.type && (
                              <span className="text-topper-amber ml-2 font-bold bg-topper-amber/10 border border-topper-amber/20 px-1.5 py-0.5 rounded text-[10px]">
                                {q.type.toUpperCase().replace('_', ' ')}
                              </span>
                            )}
                          </p>
                          {(() => {
                            const { cleanText, imageUrl } = parseQuestionText(
                              q.type === 'assertion_reason'
                                ? (q.question || (language === 'hi' ? 'नीचे दो कथन दिए गए हैं, एक को अभिकथन (A) और दूसरे को कारण (R) के रूप में लेबल किया गया है:' : 'Given below are two statements, one is labelled as Assertion (A) and the other is labelled as Reason (R):'))
                                : q.question
                            );
                            return (
                              <>
                                <p className="font-medium leading-relaxed whitespace-pre-wrap">
                                  {cleanText}
                                </p>
                                {imageUrl && (
                                  <div className="mt-4 border border-topper-graphite/40 rounded-lg overflow-hidden max-w-xl bg-topper-black/30">
                                    <img 
                                      src={imageUrl} 
                                      alt="Question Diagram" 
                                      className="max-h-[300px] w-auto object-contain mx-auto p-2"
                                    />
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {/* Assertion/Reason custom statements in header */}
                          {q.type === 'assertion_reason' && (
                            <div className="mt-3 space-y-2 border-l-4 border-topper-amber pl-3.5 py-1">
                              <p className="text-sm"><span className="font-extrabold text-topper-amber">Assertion (A):</span> {q.assertion}</p>
                              <p className="text-sm"><span className="font-extrabold text-topper-amber">Reason (R):</span> {q.reason}</p>
                            </div>
                          )}

                          {/* Matching list custom grid in header */}
                          {q.type === 'matching' && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-topper-black/40 p-4 border border-topper-graphite/40 rounded-lg">
                              <div>
                                <h4 className="text-xs font-extrabold text-topper-amber mb-2 uppercase tracking-widest">List I</h4>
                                <div className="space-y-1.5">
                                  {q.list_i && Object.entries(q.list_i).map(([num, val]) => (
                                    <div key={num} className="text-sm bg-topper-charcoal/40 px-3 py-1.5 rounded border border-topper-graphite/20 flex gap-2">
                                      <span className="font-bold text-topper-amber">{num}.</span>
                                      <span>{val}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-extrabold text-topper-amber mb-2 uppercase tracking-widest">List II</h4>
                                <div className="space-y-1.5">
                                  {q.list_ii && Object.entries(q.list_ii).map(([roman, val]) => (
                                    <div key={roman} className="text-sm bg-topper-charcoal/40 px-3 py-1.5 rounded border border-topper-graphite/20 flex gap-2">
                                      <span className="font-bold text-topper-amber">{roman}.</span>
                                      <span>{val}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Question Timer Indicator on the right hand side */}
                      <div className="flex-shrink-0 ml-4 self-center select-none">
                        {expandedId === q.id && !selectedAnswers[q.id] && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-topper-amber/10 border border-topper-amber/30 text-topper-amber text-xs font-mono font-black rounded-md animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatElapsed(activeQuestionTime)}</span>
                          </div>
                        )}
                        {selectedAnswers[q.id] && questionTimes[q.id] !== undefined && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-topper-graphite/20 border border-topper-graphite/60 text-topper-graphite text-xs font-mono font-bold rounded-md">
                            <Clock className="w-3.5 h-3.5 animate-none" />
                            <span>{formatElapsed(questionTimes[q.id])}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Print version always shows question */}
                  <div className="print-only p-5">
                    {(() => {
                      const { cleanText, imageUrl } = parseQuestionText(
                        q.type === 'assertion_reason'
                          ? (q.question || (language === 'hi' ? 'नीचे दो कथन दिए गए हैं, एक को अभिकथन (A) और दूसरे को कारण (R) के रूप में लेबल किया गया है:' : 'Given below are two statements, one is labelled as Assertion (A) and the other is labelled as Reason (R):'))
                          : q.question
                      );
                      return (
                        <>
                          <p className="font-bold mb-3 whitespace-pre-wrap">
                            Q{index + 1}. {cleanText}
                          </p>
                          {imageUrl && (
                            <div className="mb-4">
                              <img src={imageUrl} alt="Diagram" className="max-h-[250px] w-auto object-contain" />
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {q.type === 'assertion_reason' && (
                      <div className="space-y-1.5 mb-3 pl-4 border-l-2 border-black">
                        <p className="text-sm"><span className="font-bold">Assertion (A):</span> {q.assertion}</p>
                        <p className="text-sm"><span className="font-bold">Reason (R):</span> {q.reason}</p>
                      </div>
                    )}
                    {q.type === 'matching' && (
                      <div className="grid grid-cols-2 gap-4 mb-3 pl-4 border-l-2 border-black">
                        <div>
                          <p className="text-xs font-bold uppercase mb-1">List I</p>
                          {q.list_i && Object.entries(q.list_i).map(([num, val]) => (
                            <p key={num} className="text-xs">{num}. {val}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase mb-1">List II</p>
                          {q.list_ii && Object.entries(q.list_ii).map(([roman, val]) => (
                            <p key={roman} className="text-xs">{roman}. {val}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options — always visible on screen if expanded, always visible on print */}
                  <AnimatePresence>
                    {expandedId === q.id && (
                      <motion.div
                        key="options"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="no-print"
                      >
                        <div className="px-5 pb-5 space-y-2">
                          {q.type === 'fitb' ? (
                            <div className="space-y-3">
                              {selectedAnswers[q.id] ? (
                                <div className="p-4 bg-topper-black/40 border-2 border-topper-graphite rounded-md flex items-center justify-between text-sm shadow-md">
                                  <div className="flex items-center gap-2">
                                    <span className="text-topper-graphite">{language === 'hi' ? 'सहेजा गया उत्तर:' : 'Saved Answer:'}</span>
                                    <span className="font-extrabold text-topper-amber">{selectedAnswers[q.id]}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedAnswers(prev => {
                                        const next = { ...prev }
                                        delete next[q.id]
                                        return next
                                      })
                                    }}
                                    className="text-xs bg-topper-charcoal border border-topper-graphite hover:border-topper-amber text-topper-amber px-3 py-1.5 rounded font-black cursor-pointer transition-colors"
                                  >
                                    {language === 'hi' ? 'उत्तर बदलें' : 'Change Answer'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <input
                                    type="text"
                                    value={tempFitbInputs[q.id] || ''}
                                    onChange={(e) => setTempFitbInputs(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder={language === 'hi' ? 'अपना उत्तर यहाँ लिखें...' : 'Type your answer...'}
                                    className="flex-1 bg-topper-black border-2 border-topper-graphite text-topper-off-white text-sm px-4 py-2.5 rounded-md focus:outline-none focus:border-topper-amber placeholder-topper-graphite transition-all"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const val = (tempFitbInputs[q.id] || '').trim()
                                        if (val) {
                                          setSelectedAnswers(prev => ({ ...prev, [q.id]: val }))
                                          if (expandedId === q.id) {
                                            setActiveQuestionTimerRunning(false)
                                            setQuestionTimes(prev => ({ ...prev, [q.id]: activeQuestionTime }))
                                          }
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const val = (tempFitbInputs[q.id] || '').trim()
                                      if (!val) return
                                      setSelectedAnswers(prev => ({ ...prev, [q.id]: val }))
                                      if (expandedId === q.id) {
                                        setActiveQuestionTimerRunning(false)
                                        setQuestionTimes(prev => ({ ...prev, [q.id]: activeQuestionTime }))
                                      }
                                    }}
                                    className="px-5 py-2.5 bg-topper-amber text-topper-black font-extrabold text-sm rounded-md hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] border-2 border-topper-black cursor-pointer"
                                  >
                                    {language === 'hi' ? 'उत्तर सहेजें' : 'Save Answer'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : q.type === 'msq' ? (
                            <div className="space-y-3">
                              {selectedAnswers[q.id] ? (
                                <div className="p-4 bg-topper-black/40 border-2 border-topper-graphite rounded-md flex items-center justify-between text-sm shadow-md">
                                  <div className="flex items-center gap-2">
                                    <span className="text-topper-graphite">{language === 'hi' ? 'सहेजे गए विकल्प:' : 'Saved Options:'}</span>
                                    <span className="font-extrabold text-topper-amber">{selectedAnswers[q.id].split(',').join(', ')}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedAnswers(prev => {
                                        const next = { ...prev }
                                        delete next[q.id]
                                        return next
                                      })
                                    }}
                                    className="text-xs bg-topper-charcoal border border-topper-graphite hover:border-topper-amber text-topper-amber px-3 py-1.5 rounded font-black cursor-pointer transition-colors"
                                  >
                                    {language === 'hi' ? 'उत्तर बदलें' : 'Change Answer'}
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    {OPTION_KEYS.map(key => {
                                      const isSelected = (tempSelections[q.id] || []).includes(key)
                                      return (
                                        <button
                                          key={key}
                                          onClick={() => {
                                            setTempSelections(prev => {
                                              const current = prev[q.id] || []
                                              if (current.includes(key)) {
                                                return { ...prev, [q.id]: current.filter(k => k !== key) }
                                              } else {
                                                return { ...prev, [q.id]: [...current, key] }
                                              }
                                            })
                                          }}
                                          className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-2 transition-colors cursor-pointer ${
                                            isSelected
                                              ? 'border-topper-amber bg-topper-amber/10'
                                              : 'border-topper-graphite hover:border-topper-amber/80'
                                          }`}
                                        >
                                          <div className={`w-5 h-5 flex-shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                                            isSelected
                                              ? 'border-topper-amber bg-topper-amber text-topper-black font-extrabold'
                                              : 'border-topper-graphite'
                                          }`}>
                                            {isSelected && <span className="text-[10px]">✓</span>}
                                          </div>
                                          <span className={`w-7 h-7 flex-shrink-0 rounded-md font-bold text-sm flex items-center justify-center transition-colors ${
                                            isSelected
                                              ? 'bg-topper-amber text-topper-black'
                                              : 'bg-topper-graphite text-topper-off-white'
                                          }`}>
                                            {key}
                                          </span>
                                          <span className="text-sm text-topper-off-white">{q.options?.[key]}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      disabled={!(tempSelections[q.id] && tempSelections[q.id].length > 0)}
                                      onClick={() => {
                                        const selected = tempSelections[q.id] || []
                                        if (selected.length === 0) return
                                        const finalAns = [...selected].sort().join(',')
                                        setSelectedAnswers(prev => ({ ...prev, [q.id]: finalAns }))
                                        if (expandedId === q.id) {
                                          setActiveQuestionTimerRunning(false)
                                          setQuestionTimes(prev => ({ ...prev, [q.id]: activeQuestionTime }))
                                        }
                                      }}
                                      className="px-5 py-2.5 bg-topper-amber text-topper-black font-extrabold text-sm rounded-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 transition-all shadow-[2px_2px_0_rgba(0,0,0,1)] border-2 border-topper-black cursor-pointer"
                                    >
                                      {language === 'hi' ? 'उत्तर सहेजें' : 'Save Answer'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {OPTION_KEYS.map(key => {
                                const isSelected = key === selectedAnswers[q.id]
                                return (
                                  <motion.button
                                    key={key}
                                    onClick={() => handleSelectOption(q.id, key)}
                                    whileHover={{ scale: 1.01, x: 4 }}
                                    whileTap={{ scale: 0.99 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-2 cursor-pointer transition-all duration-200 ${
                                      isSelected
                                        ? 'border-topper-amber bg-gradient-to-r from-topper-amber/15 to-topper-amber/5 shadow-lg shadow-topper-amber/5'
                                        : 'border-topper-graphite hover:border-topper-amber/60 hover:bg-topper-charcoal/30'
                                    }`}
                                  >
                                    <span className={`w-7 h-7 flex-shrink-0 rounded-md font-bold text-sm flex items-center justify-center transition-colors duration-200 ${
                                      isSelected
                                        ? 'bg-topper-amber text-topper-black shadow-md shadow-topper-amber/30'
                                        : 'bg-topper-graphite text-topper-off-white'
                                    }`}>
                                      {key}
                                    </span>
                                    <span className={`text-sm transition-colors duration-200 ${
                                      isSelected ? 'text-topper-amber font-semibold' : 'text-topper-off-white'
                                    }`}>
                                      {q.options?.[key]}
                                    </span>
                                    {isSelected && (
                                      <motion.div 
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="ml-auto w-4 h-4 rounded-full bg-topper-amber flex items-center justify-center text-topper-black text-[9px] font-black"
                                      >
                                        ✓
                                      </motion.div>
                                    )}
                                  </motion.button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Print options — always shown on paper */}
                  {q.type !== 'fitb' && (
                    <div className="print-only px-5 pb-5 space-y-1">
                      {OPTION_KEYS.map(key => (
                        <p key={key} className="text-sm">
                          ({key}) {q.options?.[key]}
                        </p>
                      ))}
                    </div>
                  )}
                  {q.type === 'fitb' && (
                    <div className="print-only px-5 pb-5">
                      <p className="text-sm text-gray-500">{language === 'hi' ? 'उत्तर:' : 'Answer:'} ____________________________________</p>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Submit Test Button at the bottom of the list */}
              {!isSubmitted && (
                <div className="no-print mt-20 mb-10 flex flex-col items-center justify-center relative py-6">
                  {/* Visual impact background glow */}
                  {isSubmitEnabled && (
                    <div className="absolute w-72 h-20 bg-[#f5a623]/10 rounded-full blur-2xl filter animate-pulse pointer-events-none" />
                  )}

                  <motion.button
                    whileHover={isSubmitEnabled ? { scale: 1.02 } : {}}
                    whileTap={isSubmitEnabled ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (isSubmitEnabled) {
                        setShowSubmitModal(true)
                      }
                    }}
                    disabled={!isSubmitEnabled}
                    className="group relative px-16 py-5 bg-[#121212] text-topper-off-white hover:text-topper-amber border-2 border-topper-graphite hover:border-topper-amber rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden tracking-wider select-none font-bold text-xl flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-topper-off-white disabled:hover:border-topper-graphite"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🚀</span>
                    <span className="uppercase font-black tracking-widest">
                      {language === 'hi' ? 'चुनौती पूर्ण करें' : 'Finish Challenge'}
                    </span>
                  </motion.button>
                  {!isSubmitEnabled && (
                    <p className="text-sm text-red-400 font-extrabold mt-3 uppercase tracking-wider animate-pulse">
                      ⚠️ {getSubmitWaitTimeText()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Answer key (print only) ── */}
          <div className="answer-key">
            {/* Force new page for Answer Key */}
            <div className="p-4 border-2 border-black mb-6 print:break-before-page" style={{ pageBreakBefore: 'always' }}>
              <h2 className="text-xl font-black mb-3">{t('success.answerKey')}</h2>
              <div className="grid grid-cols-5 gap-4 text-sm">
                {paper.questions.map((q, i) => (
                  <div key={q.id}>
                    <span className="font-bold">{i + 1}.</span> {q.correct_answer}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Force new page for Explanations */}
            <div className="p-4 border-2 border-black print:break-before-page" style={{ pageBreakBefore: 'always' }}>
              <h2 className="text-xl font-black mb-4">{language === 'hi' ? 'स्पष्टीकरण' : 'Explanations'}</h2>
              <div className="space-y-4 text-sm">
                {paper.questions.map((q, i) => (
                  <div key={q.id} className="break-inside-avoid mb-4 border-b pb-4 last:border-b-0">
                    <p className="font-bold mb-1">Q{i + 1}. ({language === 'hi' ? 'उत्तर' : 'Answer'}: {q.correct_answer})</p>
                    <p>{q.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom actions ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="no-print flex flex-col md:flex-row gap-4 items-center justify-center pt-12 mt-12 border-t-2 border-topper-graphite"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="flex items-center gap-2 px-8 py-4 bg-topper-amber text-topper-black font-black border-2 border-topper-amber rounded-md"
            >
              <Download className="w-5 h-5" />
              {t('success.printDownload')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewPaper}
              className="flex items-center gap-2 px-8 py-4 bg-transparent text-topper-off-white font-bold border-2 border-topper-off-white hover:bg-topper-off-white hover:text-topper-black transition-colors rounded-md"
            >
              {language === 'hi' ? 'दूसरा पेपर जनरेट करें' : 'Generate Another'}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-[#0a0a0a]/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#121212] border-2 border-topper-graphite p-8 rounded-lg shadow-2xl max-w-md w-full relative"
            >
              <h2 className="text-2xl font-black mb-2 uppercase tracking-tight text-topper-off-white flex items-center gap-2">
                <span>📝</span> {language === 'hi' ? 'परीक्षा जमा करें?' : 'Submit Test?'}
              </h2>
              <div className="h-[1px] bg-topper-graphite/40 mb-6" />
              
              <div className="space-y-4 my-6 text-topper-off-white/80">
                <p className="text-sm leading-relaxed">
                  {language === 'hi'
                    ? 'क्या आप सच में अपनी परीक्षा जमा करना चाहते हैं? कृपया अपने उत्तरों की समीक्षा कर लें।'
                    : 'Are you sure you want to submit your practice test? Please review your progress below:'}
                </p>
                
                <div className="p-4 bg-[#0a0a0a] border-2 border-topper-graphite rounded-md grid grid-cols-2 gap-4 text-center shadow-md">
                  <div>
                    <p className="text-[#a0a0a0] text-[10px] uppercase font-black tracking-widest">{language === 'hi' ? 'कुल प्रश्न' : 'Total Questions'}</p>
                    <p className="text-3xl font-black text-white mt-1">{paper.questions.length}</p>
                  </div>
                  <div>
                    <p className="text-[#a0a0a0] text-[10px] uppercase font-black tracking-widest">{language === 'hi' ? 'हल किए गए' : 'Answered'}</p>
                    <p className="text-3xl font-black text-topper-amber mt-1">{Object.keys(selectedAnswers).length}</p>
                  </div>
                </div>

                {Object.keys(selectedAnswers).length < paper.questions.length && (
                  <div className="p-3 bg-[#2b1010] border-2 border-red-500 rounded-md flex items-start gap-2.5 shadow-md">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <div>
                      <p className="text-xs text-red-200 font-extrabold leading-tight">
                        {language === 'hi' 
                          ? `चेतावनी: आपने ${paper.questions.length - Object.keys(selectedAnswers).length} प्रश्नों का उत्तर नहीं दिया है!` 
                          : `Warning: You have left ${paper.questions.length - Object.keys(selectedAnswers).length} questions unanswered!`}
                      </p>
                      <p className="text-[10px] text-red-300/80 mt-1">
                        {language === 'hi' ? 'जमा करने के बाद आप उत्तर नहीं बदल पाएंगे।' : 'You cannot change your answers after submitting.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 items-center justify-end mt-8 pt-4 border-t border-topper-graphite/40">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-5 py-2.5 bg-transparent hover:bg-topper-graphite/40 border-2 border-topper-graphite text-topper-off-white text-xs font-black uppercase tracking-wider rounded-md cursor-pointer transition-all active:translate-y-0.5"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('userAnswers', JSON.stringify(selectedAnswers))
                    localStorage.setItem('userQuestionTimes', JSON.stringify(questionTimes))
                    localStorage.setItem('userTotalTime', String(totalActiveSolveTime))
                    setShowSubmitModal(false)
                    router.push(`/success/${subjectId}/result`)
                  }}
                  className="px-6 py-2.5 bg-topper-amber hover:bg-white text-topper-black text-xs font-black uppercase tracking-wider border-2 border-topper-amber hover:border-white rounded-md transition-all cursor-pointer shadow-md"
                >
                  {language === 'hi' ? 'हाँ, जमा करें' : 'Yes, Submit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
