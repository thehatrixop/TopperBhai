'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react'
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
  question: string
  options: Option
  correct_answer: string
  explanation: string
}

interface PaperData {
  questions: Question[]
  topics: string[]
  challenge: string
  question_count: number
  subject_id: string
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
  const { language, setLanguage, t } = useLanguage()
  const [paper, setPaper]               = useState<PaperData | null>(null)
  const [showAnswers, setShowAnswers]   = useState(false)
  const [expandedId, setExpandedId]     = useState<number | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [timeElapsed, setTimeElapsed]   = useState(0)
  const [timerActive, setTimerActive]   = useState(false)

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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (timerActive) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerActive])

  const totalQuestions = paper?.questions.length || 0
  const answeredCount = Object.keys(selectedAnswers).length

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
        setPaper(JSON.parse(raw))
      } catch {
        console.error('Failed to parse paper data')
      }
    }
  }, [])

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
          <span className="text-2xl font-bold tracking-tighter">{t('subjects.back')}</span>
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="bg-topper-charcoal border border-topper-graphite/40 text-topper-off-white text-xs font-semibold rounded-full px-3 py-1.5 focus:outline-none focus:border-topper-amber/70 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>

            {/* Stopwatch Timer Controls */}
            <div className="flex items-center gap-2 bg-topper-charcoal border-2 border-topper-graphite p-1 rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)]">
              <div className="px-3.5 py-1.5 font-mono font-black text-sm flex items-center gap-1.5 select-none">
                <span className={`w-2 h-2 rounded-full ${timerActive ? 'bg-red-500 animate-pulse' : 'bg-topper-graphite'}`} />
                <span className="text-topper-graphite">{t('success.time')}:</span>
                <span className={timerActive ? 'text-topper-amber' : 'text-topper-off-white'}>
                  {formatElapsed(timeElapsed)}
                </span>
              </div>
              
              <div className="flex gap-1 border-l border-topper-graphite/40 pl-1">
                {/* Start / Pause / Resume Button */}
                {!timerActive && timeElapsed === 0 ? (
                  <button
                    onClick={() => setTimerActive(true)}
                    className="px-2.5 py-1 text-xs font-black bg-topper-amber text-topper-black border border-topper-amber rounded hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    {t('success.start')}
                  </button>
                ) : timerActive ? (
                  <button
                    onClick={() => setTimerActive(false)}
                    className="px-2.5 py-1 text-xs font-black bg-transparent text-topper-off-white border border-topper-graphite hover:border-red-500 hover:text-red-500 rounded hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    {t('success.pause')}
                  </button>
                ) : (
                  <button
                    onClick={() => setTimerActive(true)}
                    className="px-2.5 py-1 text-xs font-black bg-topper-amber text-topper-black border border-topper-amber rounded hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    {t('success.resume')}
                  </button>
                )}
 
                {/* Restart / Reset Button */}
                {(timeElapsed > 0 || timerActive) && (
                  <button
                    onClick={() => {
                      setTimerActive(false)
                      setTimeElapsed(0)
                    }}
                    className="px-2.5 py-1 text-xs font-black bg-transparent text-topper-graphite hover:text-topper-off-white border border-topper-graphite hover:border-topper-off-white rounded hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                    title="Restart timer"
                  >
                    {language === 'hi' ? 'पुनः आरंभ करें' : 'Restart'}
                  </button>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAnswers(p => !p)}
              className={`px-4 py-2 font-bold border-2 rounded text-sm transition-colors ${
                showAnswers
                  ? 'bg-topper-amber border-topper-amber text-topper-black'
                  : 'border-topper-graphite text-topper-off-white hover:border-topper-amber'
              }`}
            >
              {showAnswers 
                ? (language === 'hi' ? 'उत्तर और स्पष्टीकरण छिपाएं' : 'Hide Answers & Explanations') 
                : t('success.showAnswers')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-topper-amber text-topper-black font-bold border-2 border-topper-amber rounded text-sm"
            >
              <Download className="w-4 h-4" />
              {t('success.printDownload')}
            </motion.button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
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

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-6 bg-topper-charcoal border-2 border-topper-graphite rounded">
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
                  <p className="text-topper-graphite text-xs mb-1">{language === 'hi' ? 'लिया गया समय' : 'TIME TAKEN'}</p>
                  <p className={`text-3xl font-black font-mono transition-colors ${activeQuestionTimerRunning ? 'text-topper-amber animate-pulse' : 'text-topper-off-white'}`}>
                    {formatElapsed(totalActiveSolveTime)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Questions ── */}
          <div className="space-y-6">
            {paper.questions.map((q, index) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 1) }}
                className="question-card bg-topper-charcoal border-2 border-topper-graphite rounded-lg overflow-hidden"
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
                      <span className="flex-shrink-0 w-8 h-8 bg-topper-amber text-topper-black rounded font-black text-sm flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs text-topper-graphite mb-1 uppercase tracking-wider">{q.topic}</p>
                        <p className="font-medium leading-relaxed">{q.question}</p>
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
                  <p className="font-bold mb-3">Q{index + 1}. {q.question}</p>
                </div>

                {/* Options — always visible on screen if expanded or showAnswers, always visible on print */}
                <AnimatePresence>
                  {(expandedId === q.id || showAnswers) && (
                    <motion.div
                      key="options"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="no-print"
                    >
                      <div className="px-5 pb-5 space-y-2">
                        {OPTION_KEYS.map(key => {
                          const isCorrect = key === q.correct_answer
                          const selectedOption = selectedAnswers[q.id]
                          const showResult = showAnswers || !!selectedOption
                          const isSelected = key === selectedOption

                          return (
                            <button
                              key={key}
                              disabled={showResult}
                              onClick={() => handleSelectOption(q.id, key)}
                              className={`w-full text-left flex items-center gap-3 p-3 rounded border-2 transition-colors ${
                                showResult
                                  ? isCorrect
                                    ? 'border-green-500 bg-green-500/10 cursor-default'
                                    : isSelected
                                    ? 'border-red-500 bg-red-500/10 cursor-default'
                                    : 'border-topper-graphite/30 opacity-60 cursor-default'
                                  : 'border-topper-graphite hover:border-topper-amber/80 cursor-pointer'
                              }`}
                            >
                              <span className={`w-7 h-7 flex-shrink-0 rounded font-bold text-sm flex items-center justify-center transition-colors ${
                                showResult
                                  ? isCorrect
                                    ? 'bg-green-500 text-white'
                                    : isSelected
                                    ? 'bg-red-500 text-white'
                                    : 'bg-topper-graphite text-topper-off-white opacity-60'
                                  : 'bg-topper-graphite text-topper-off-white'
                              }`}>
                                {key}
                              </span>
                              <span className="text-sm text-topper-off-white">{q.options[key]}</span>
                              {showResult && isCorrect && (
                                <CheckCircle className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                              )}
                              {showResult && isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />
                              )}
                            </button>
                          )
                        })}

                        {/* Explanation */}
                        {(showAnswers || !!selectedAnswers[q.id]) && q.explanation && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="mt-3 p-3 bg-topper-black border-l-4 border-topper-amber rounded-r text-sm text-topper-off-white/80"
                          >
                            {selectedAnswers[q.id] && (
                              <div className="mb-2 text-xs font-bold">
                                {selectedAnswers[q.id] === q.correct_answer ? (
                                  <span className="text-green-400 flex items-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5 inline" /> {language === 'hi' ? 'सही! बहुत बढ़िया।' : 'Correct! Well done.'}
                                  </span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 inline" /> {language === 'hi' ? `गलत। सही उत्तर ${q.correct_answer} है।` : `Incorrect. The correct answer is ${q.correct_answer}.`}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="text-topper-amber font-bold">{t('success.explanation')}: </span>
                            {q.explanation}
                          </motion.div>
                        )}

                        {selectedAnswers[q.id] && selectedAnswers[q.id] !== q.correct_answer && (
                          <QuestionChat
                            question={q}
                            selectedAnswer={selectedAnswers[q.id]}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Print options — always shown on paper */}
                <div className="print-only px-5 pb-5 space-y-1">
                  {OPTION_KEYS.map(key => (
                    <p key={key} className="text-sm">
                      ({key}) {q.options[key]}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

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
              className="flex items-center gap-2 px-8 py-4 bg-topper-amber text-topper-black font-black border-2 border-topper-amber rounded"
            >
              <Download className="w-5 h-5" />
              {t('success.printDownload')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewPaper}
              className="flex items-center gap-2 px-8 py-4 bg-transparent text-topper-off-white font-bold border-2 border-topper-off-white hover:bg-topper-off-white hover:text-topper-black transition-colors rounded"
            >
              {language === 'hi' ? 'दूसरा पेपर जनरेट करें' : 'Generate Another'}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

        </div>
      </div>
    </>
  )
}
