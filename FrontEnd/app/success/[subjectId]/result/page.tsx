'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, RefreshCw, MessageSquare, ChevronRight, CheckCircle, XCircle, HelpCircle, Shield, Zap, AlertTriangle, Disc, Clock } from 'lucide-react'
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
  type?: 'mcq' | 'msq' | 'fitb' | 'assertion_reason' | 'matching'
  topic: string
  question: string
  assertion?: string
  reason?: string
  list_i?: Record<string, string>
  list_ii?: Record<string, string>
  options?: Option
  correct_answer: string
  explanation: string
}

interface PaperData {
  questions: Question[]
  topics: string[]
  challenge: string
  question_count: number
  subject_id: string
  timeLimit?: string
}

export default function ResultPage() {
  const router = useRouter()
  const params = useParams()
  const subjectId = params.subjectId as string

  const { language, setLanguage, t } = useLanguage()
  const [paper, setPaper] = useState<PaperData | null>(null)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({})
  const [totalTime, setTotalTime] = useState<number>(0)
  const [activeChatId, setActiveChatId] = useState<number | null>(null)

  useEffect(() => {
    const rawPaper = localStorage.getItem('paperData')
    const rawAnswers = localStorage.getItem('userAnswers')
    const rawTimes = localStorage.getItem('userQuestionTimes')
    const rawTotalTime = localStorage.getItem('userTotalTime')

    if (rawPaper) {
      try {
        setPaper(JSON.parse(rawPaper))
      } catch (e) {
        console.error('Failed to parse paperData', e)
      }
    }

    if (rawAnswers) {
      try {
        setUserAnswers(JSON.parse(rawAnswers))
      } catch (e) {
        console.error('Failed to parse userAnswers', e)
      }
    }

    if (rawTimes) {
      try {
        setQuestionTimes(JSON.parse(rawTimes))
      } catch (e) {
        console.error('Failed to parse userQuestionTimes', e)
      }
    }

    if (rawTotalTime) {
      setTotalTime(Number(rawTotalTime) || 0)
    }
  }, [])

  if (!paper || paper.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#090b0e] text-[#e2e8f0] flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-slate-500">No telemetry log found.</p>
          <p className="text-sm text-slate-600">Please complete a race run first.</p>
        </div>
        <button
          onClick={() => router.push('/subjects')}
          className="px-6 py-3 bg-[#3b82f6] text-white font-extrabold border border-blue-500 rounded hover:bg-blue-600 transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.4)]"
        >
          Return to subjects
        </button>
      </div>
    )
  }

  let correctCount = 0
  let incorrectCount = 0
  let skippedCount = 0

  paper.questions.forEach(q => {
    const ans = userAnswers[q.id]
    if (!ans) {
      skippedCount++
    } else if (ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
      correctCount++
    } else {
      incorrectCount++
    }
  })

  const scorePercentage = paper.questions.length > 0 ? (correctCount / paper.questions.length) : 0
  const scorePercentValue = Math.round(scorePercentage * 100)

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Telemetry Smart diagnosis
  const getSmartAnalysis = (q: Question) => {
    const ans = userAnswers[q.id]
    const isUnattempted = !ans
    const isCorrect = !isUnattempted && ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()

    const keywords = [
      { word: 'sql', concept: 'SQL Database Queries', gap: 'relational algebraic mapping, inner/outer join constraints, or SQL filter order', next: 'query optimization, indexing indices, and isolation levels' },
      { word: 'join', concept: 'SQL Joins', gap: 'Inner vs Outer join row expansion and null propagation rules', next: 'correlated subqueries, execution plans, and hash-join algorithms' },
      { word: 'normal', concept: 'Database Normalization', gap: 'functional dependencies, transitive dependencies, and 3NF/BCNF guidelines', next: '4NF, multi-valued dependency rules, and lossless decomposition' },
      { word: 'lock', concept: 'Concurrency Control', gap: 'two-phase locking protocols, shared/exclusive locks, or deadlock cycles', next: 'MVCC mechanics, serializability graphs, and transaction levels' },
      { word: 'process', concept: 'OS Process Management', gap: 'process control block attributes, context switching, or scheduler states', next: 'IPC message passing, shared buffer algorithms, and pipe setups' },
      { word: 'thread', concept: 'Threads & Concurrency', gap: 'thread control blocks, resource sharing, or kernel/user thread bounds', next: 'mutex locks, semaphore bounds, and critical section problems' },
      { word: 'schedul', concept: 'CPU Scheduling Algorithms', gap: 'calculating average wait times for Round Robin, SJF, or SRTF preemption', next: 'Rate Monotonic scheduling, EDF algorithms, and multi-core models' },
      { word: 'deadlock', concept: 'Deadlocks', gap: 'mutual exclusion, hold & wait, no-preemption, or circular wait validation', next: 'Banker\'s safe sequence mapping and resource graphs' },
      { word: 'memory', concept: 'Memory Management', gap: 'logical-to-physical address mapping, internal segmentation, or pagination limits', next: 'translation lookaside buffers (TLB), inverted pages, and page frames' },
      { word: 'page', concept: 'Virtual Memory & Page Replacement', gap: 'page fault calculations for FIFO, LRU, or Optimal replacement arrays', next: 'thrashing limits, working set algorithms, and page allocations' },
      { word: 'ip', concept: 'IP Addressing & Subnetting', gap: 'subnet boundaries, CIDR notation limits, or broadcast network math', next: 'routing table routing, OSPF, BGP, and IPv6 header transitions' },
      { word: 'tcp', concept: 'TCP/IP Transport Layer', gap: 'three-way handshake phases, sliding window flow control, or congestion states', next: 'TCP flow window sizing, multiplexing, and modern QUIC streams' },
      { word: 'gram', concept: 'Formal Grammars & Automata', gap: 'Chomsky grammar hierarchies, ambiguous productions, or grammar derivations', next: 'constructing DPDA models and parser mechanics (LL, LR)' },
      { word: 'regular', concept: 'Regular Languages', gap: 'regular expressions, minimal DFA steps, or pumping lemma bounds', next: 'DFA state reduction steps and closure theorems' },
      { word: 'tree', concept: 'Tree Data Structures', gap: 'tree traversal recursion (in/pre/post order) or AVL balance calculations', next: 'Red-Black tree rebalancing, B+ tree node splits, and index trees' },
      { word: 'sort', concept: 'Sorting Algorithms', gap: 'best/worst time bounds or memory stability for quick/merge/heap sorting', next: 'stable radix sorting, external multi-way merge, and lower bound proofs' }
    ]

    const qText = (q.question + " " + q.explanation + " " + q.topic).toLowerCase()
    let matched = keywords.find(item => qText.includes(item.word))

    if (!matched) {
      matched = {
        word: '',
        concept: q.topic || 'General Sector',
        gap: 'core syllabus terms, formula mappings, or question constraints',
        next: 'advanced quiz sheets, mock exams, and textbook formulas'
      }
    }

    if (isUnattempted) {
      return {
        concept: matched.concept,
        adviceTitle: language === 'hi' ? 'सेक्टर ब्रेकअप: छूटा हुआ' : 'SECTOR ANALYSIS: PASSED BY',
        adviceText: language === 'hi'
          ? `यह सेक्टर ${matched.concept} के ऊपर है। यहाँ ब्रेक लगा। आप शायद ${matched.gap} को लेकर आश्वस्त नहीं थे।`
          : `This sector focuses on ${matched.concept}. You bypassed this sector. Unattempted runs often occur when there is uncertainty in ${matched.gap}.`,
        actionable: language === 'hi'
          ? 'ट्यूनिंग: डेटा सुधार के लिए नीचे दिए गए स्पष्टीकरण को पढ़ें और एआई मैकेनिक से चैट करें।'
          : 'Sector Tuning: Study the log details below and ask the AI mechanic to recalibrate.'
      }
    }

    if (!isCorrect) {
      return {
        concept: matched.concept,
        adviceTitle: language === 'hi' ? 'अवधारणा क्रैश (Concept Collision)' : 'TELEMETRY FAULT: TRACTION LOST',
        adviceText: language === 'hi'
          ? `आपने "${ans}" चुना, जिससे नियंत्रण खो गया। ${matched.concept} में यह गलती दर्शाती है कि ${matched.gap} के नियमों में गंभीर भटकाव था।`
          : `You selected "${ans}", losing traction in this corner. For ${matched.concept}, this slip indicates a conceptual drift regarding ${matched.gap}.`,
        actionable: language === 'hi'
          ? 'सुधार: "ट्यूटर ट्यून" शुरू करें और एआई को अपनी लाइनें ठीक करने दें।'
          : 'Correction: Click "Ask AI Tutor" below to recalibrate your lines through this corner.'
      }
    }

    return {
      concept: matched.concept,
      adviceTitle: language === 'hi' ? 'इष्टतम रेसिंग लाइन (Perfect Line)' : 'OPTIMAL SECTOR: PURPLE LAP',
      adviceText: language === 'hi'
        ? `शानदार कॉर्नरिंग! आपने बिल्कुल सही उत्तर चुना। ${matched.concept} के इस सेक्टर में ${matched.gap} पर आपका पूर्ण नियंत्रण है।`
        : `Perfect turn! You found the apex. You demonstrated absolute control of ${matched.gap} under the ${matched.concept} sector.`,
      actionable: language === 'hi'
        ? `अगला लैप: अगला लक्ष्य ${matched.next} के कठिन कॉर्नर्स हैं।`
        : `Next Lap: Challenge yourself further by hitting high-speed corners like ${matched.next}.`
    }
  }

  const handleRestart = () => {
    localStorage.removeItem('userAnswers')
    localStorage.removeItem('userQuestionTimes')
    localStorage.removeItem('userTotalTime')
    router.push(`/success/${subjectId}`)
  }

  const handleBackToSubjects = () => {
    localStorage.removeItem('userAnswers')
    localStorage.removeItem('userQuestionTimes')
    localStorage.removeItem('userTotalTime')
    localStorage.removeItem('paperData')
    router.push('/subjects')
  }

  return (
    <div className="min-h-screen bg-[#0d0f12] text-[#e2e8f0] font-sans py-12 px-6 md:px-12 selection:bg-blue-500 selection:text-white">
      {/* Decorative Grid Lines to mimic a telemetry HUD */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161a22_1px,transparent_1px),linear-gradient(to_bottom,#161a22_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10">

        {/* ── Race telemetry Header ── */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <h1 className="text-xs font-black tracking-[0.25em] text-slate-400 uppercase">BMW M-SPORT / TELEMETRY DASHBOARD</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToSubjects}
              className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-blue-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'hi' ? 'विषय' : 'Subjects'}
            </button>
            <span className="text-slate-800">|</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')}
              className="bg-[#161a22] border border-slate-800 text-[#e2e8f0] text-[10px] font-black uppercase tracking-wider rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>

        {/* ── BMW Speedometer Instrument Cluster ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          
          {/* BMW Dial Instrument */}
          <div className="md:col-span-5 bg-[#12161f] border border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
            {/* Carbon Fiber look header */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-[#ff3b30] to-red-600" />
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

            <span className="text-[10px] font-black tracking-[0.2em] text-[#ff3b30] uppercase mb-4 flex items-center gap-1">
              <Disc className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} /> TACHOMETER
            </span>
            
            <div className="w-full max-w-[240px] relative">
              <svg viewBox="0 0 200 130" className="w-full">
                {/* Dial Outer Ring */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#161a22"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Concentric Guide Ring */}
                <path
                  d="M 28 100 A 72 72 0 0 1 172 100"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />

                {/* BMW-Style Tachometer Tick marks */}
                {Array.from({ length: 19 }).map((_, i) => {
                  const angle = 180 - i * 10
                  const rad = (angle * Math.PI) / 180
                  const r1 = 70
                  const r2 = 78
                  const x1 = 100 + r1 * Math.cos(rad)
                  const y1 = 100 - r1 * Math.sin(rad)
                  const x2 = 100 + r2 * Math.cos(rad)
                  const y2 = 100 - r2 * Math.sin(rad)
                  
                  // BMW M Sport redline starts at 70% accuracy (54 deg and lower)
                  const isRedline = angle <= 54
                  const tickColor = isRedline 
                    ? '#ff3b30' // Redline Zone
                    : angle <= 108 
                    ? '#f5a623' // Mid Power
                    : '#3b82f6' // Safe Blue
                  
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={tickColor}
                      strokeWidth={i % 2 === 0 ? "2.5" : "1.2"}
                      opacity="0.8"
                    />
                  )
                })}

                {/* Instrument Center Hub Pin */}
                <circle cx="100" cy="100" r="14" fill="#090b0e" stroke="#2c374e" strokeWidth="2.5" />
                <circle cx="100" cy="100" r="6" fill="#ff3b30" />
                
                {/* Glowing BMW Red Needles */}
                <g
                  style={{
                    transform: `rotate(${-90 + (scorePercentage * 180)}deg)`,
                    transformOrigin: '100px 100px',
                    transition: 'transform 1.8s cubic-bezier(0.25, 1, 0.5, 1.1)'
                  }}
                >
                  <polygon points="98.5,100 100,10 101.5,100" fill="#ff3b30" shadow="0_0_10px_#ff3b30" />
                </g>

                {/* RPM labels */}
                <text x="18" y="112" fill="#475569" fontSize="6.5" fontWeight="900" fontFamily="monospace">0</text>
                <text x="42" y="32" fill="#475569" fontSize="6.5" fontWeight="900" fontFamily="monospace">3</text>
                <text x="100" y="8" fill="#475569" fontSize="6.5" fontWeight="900" fontFamily="monospace">5</text>
                <text x="158" y="32" fill="#ff3b30" fontSize="6.5" fontWeight="900" fontFamily="monospace" opacity="0.8">8</text>
                <text x="182" y="112" fill="#ff3b30" fontSize="6.5" fontWeight="900" fontFamily="monospace" opacity="0.8">10</text>

                {/* Digital SpeedHUD inside SVG */}
                <text x="100" y="88" fill="#ffffff" fontSize="28" fontWeight="900" fontFamily="monospace" textAnchor="middle">{scorePercentValue}</text>
                <text x="100" y="100" fill="#ff3b30" fontSize="6.5" fontWeight="black" letterSpacing="1.5" textAnchor="middle">ACCURACY %</text>
                <text x="100" y="114" fill="#475569" fontSize="6.5" fontWeight="bold" letterSpacing="2" textAnchor="middle">M-SPORT HUD</text>
              </svg>
            </div>
          </div>

          {/* Telemetry Stats (Right Cockpit Card) */}
          <div className="md:col-span-7 bg-[#12161f] border border-slate-800 p-6 rounded-xl flex flex-col justify-between shadow-lg relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-[#3b82f6]" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  {language === 'hi' ? 'लैप टेलीमेट्री रिपोर्ट' : 'LAP RUN REPORT'}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                {language === 'hi' 
                  ? 'यह मुख्य कंप्यूटर डैशबोर्ड है। सही रेसिंग लाइनों और ब्रेक घिसाव का विवरण देखें।' 
                  : 'Sector-by-sector telemetry metrics. Assess cornering accuracy and sector speeds below.'}
              </p>
            </div>

            {/* Dash Grid metrics */}
            <div className="grid grid-cols-3 gap-3 text-center mb-6">
              <div className="bg-[#121d17] border border-emerald-500/20 p-3.5 rounded-lg flex flex-col justify-between">
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">{language === 'hi' ? 'सही मोड़' : 'GREEN SECTORS'}</span>
                <p className="text-3xl font-black font-mono text-emerald-400 mt-2">{correctCount}</p>
              </div>
              <div className="bg-[#1e1313] border border-red-500/20 p-3.5 rounded-lg flex flex-col justify-between">
                <span className="text-[9px] text-[#ff3b30] font-black uppercase tracking-wider">{language === 'hi' ? 'दुर्घटना' : 'COLLISIONS'}</span>
                <p className="text-3xl font-black font-mono text-[#ff3b30] mt-2">{incorrectCount}</p>
              </div>
              <div className="bg-[#12141c] border border-slate-800 p-3.5 rounded-lg flex flex-col justify-between">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">{language === 'hi' ? 'पिट स्टॉप' : 'PIT PASSES'}</span>
                <p className="text-3xl font-black font-mono text-slate-400 mt-2">{skippedCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-slate-500 font-black uppercase">{language === 'hi' ? 'लैप समय:' : 'LAP TIME:'}</span>
                <span className="font-mono font-black text-white">{formatElapsed(totalTime)}</span>
              </div>
              <div className="font-mono text-slate-500 text-[10px] font-bold">
                <span>{paper.questions.length} SECTORS LOGGED</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Team Radio Banner ── */}
        <div className="bg-[#12161f] border border-slate-800 border-l-4 border-blue-500 p-4 rounded-r-lg flex items-start gap-4 shadow-md">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-0.5">M-SPORT TEAM RADIO</h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {scorePercentValue >= 90 
                ? (language === 'hi' ? 'अतुल्य ड्राइविंग! आपने ट्रैक के प्रत्येक कोने पर पूर्ण पकड़ बनाई रखी।' : 'Incredible driving! You locked the apex on every single corner. High speed retained.')
                : scorePercentValue >= 70
                ? (language === 'hi' ? 'बढ़िया लैप! कर्ब्स से थोड़ी टक्कर हुई, पर ट्रैक्शन बेहतरीन था।' : 'Good lap! Brushed some curbs, but your speed and traction through sectors was solid.')
                : scorePercentValue >= 50
                ? (language === 'hi' ? 'नियंत्रण असंतुलित है। नीचे दिए गए सेक्टर टेलीमेट्री चार्ट से सुधार बिंदु देखें।' : 'Understeer detected. Check the sector diagnostic logs below to adjust your entry speeds.')
                : (language === 'hi' ? 'गाड़ी ट्रैक से बाहर फिसल गई! एआई को-ड्राइवर से बात करें और दोबारा प्रयास करें।' : 'Traction lost! Spin out. Select "Ask AI Tutor" on sector faults to analyze setup failures.')
              }
            </p>
          </div>
        </div>

        {/* ── Per-Sector Telemetry Log ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="w-5 h-5 text-[#ff3b30]" />
            <h3 className="text-lg font-black uppercase tracking-wider text-white">
              {language === 'hi' ? 'प्रति-सेक्टर रन विवरण' : 'DETAILED SECTOR LOGS'}
            </h3>
          </div>

          {paper.questions.map((q, idx) => {
            const userAns = userAnswers[q.id]
            const isUnattempted = !userAns
            const isCorrect = !isUnattempted && userAns.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
            const analysis = getSmartAnalysis(q)

            return (
              <div
                key={q.id}
                className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                  isCorrect
                    ? 'border-emerald-500/30 bg-[#0e1613]'
                    : isUnattempted
                    ? 'border-slate-800 bg-[#12151c]'
                    : 'border-[#ff3b30]/30 bg-[#181113]'
                }`}
              >
                {/* Header bar */}
                <div className="px-5 py-4 border-b border-slate-800/80 flex items-start gap-4 justify-between bg-black/20">
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-md font-mono font-black text-sm flex items-center justify-center ${
                      isCorrect 
                        ? 'bg-emerald-500 text-black' 
                        : isUnattempted 
                        ? 'bg-slate-700 text-slate-200' 
                        : 'bg-[#ff3b30] text-white'
                    }`}>
                      S{idx + 1}
                    </span>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">
                        {q.topic}
                      </span>
                      <h4 className="font-bold text-sm text-[#f1f5f9] leading-snug mt-0.5">
                        {q.type === 'assertion_reason'
                          ? (language === 'hi' ? 'अभिकथन (A) और कारण (R) सत्यापन' : 'Assertion (A) & Reason (R) Verification')
                          : q.question
                        }
                      </h4>
                    </div>
                  </div>

                  {/* Status Tag */}
                  <div className="flex-shrink-0 ml-4 select-none">
                    {isCorrect ? (
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded font-black uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {language === 'hi' ? 'पारित' : 'CLEARED'}
                      </span>
                    ) : isUnattempted ? (
                      <span className="text-[10px] bg-slate-800/40 border border-slate-700 text-slate-400 px-3 py-1 rounded font-black uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        {language === 'hi' ? 'छोड़ा' : 'BYPASSED'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#ff3b30]/10 border border-[#ff3b30]/30 text-[#ff3b30] px-3 py-1 rounded font-black uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        {language === 'hi' ? 'क्षति' : 'FAULT'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Detail Box */}
                <div className="p-5 space-y-4">
                  
                  {/* Statements */}
                  {q.type === 'assertion_reason' && (
                    <div className="space-y-2 border-l-4 border-blue-500 pl-4 py-1.5 bg-[#090b0e] rounded-r">
                      <p className="text-sm"><span className="font-black text-blue-400">Assertion (A):</span> {q.assertion}</p>
                      <p className="text-sm"><span className="font-black text-blue-400">Reason (R):</span> {q.reason}</p>
                    </div>
                  )}

                  {/* Grid layout */}
                  {q.type === 'matching' && q.list_i && q.list_ii && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#090b0e] p-4 border border-slate-800 rounded-lg">
                      <div>
                        <h5 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">List I</h5>
                        <div className="space-y-1.5">
                          {Object.entries(q.list_i).map(([num, val]) => (
                            <div key={num} className="text-xs bg-[#12151c] px-3 py-1.5 rounded border border-slate-800 flex gap-2">
                              <span className="font-black text-blue-400">{num}.</span>
                              <span>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">List II</h5>
                        <div className="space-y-1.5">
                          {Object.entries(q.list_ii).map(([roman, val]) => (
                            <div key={roman} className="text-xs bg-[#12151c] px-3 py-1.5 rounded border border-slate-800 flex gap-2">
                              <span className="font-black text-blue-400">{roman}.</span>
                              <span>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MCQ choices */}
                  {q.type !== 'fitb' && q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {Object.entries(q.options).map(([key, value]) => {
                        const correctKeys = q.correct_answer.split(',').map(s => s.trim())
                        const selectedKeys = (userAns || '').split(',').map(s => s.trim()).filter(Boolean)
                        
                        const isOptCorrect = correctKeys.includes(key)
                        const isOptSelected = selectedKeys.includes(key)

                        return (
                          <div
                            key={key}
                            className={`p-3 rounded border flex items-center gap-3 text-xs select-none ${
                              isOptCorrect
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold'
                                : isOptSelected
                                ? 'bg-[#ff3b30]/10 border-[#ff3b30] text-red-300 font-bold'
                                : 'bg-[#090b0e] border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className={`w-6 h-6 flex-shrink-0 rounded font-black text-xs flex items-center justify-center ${
                              isOptCorrect
                                ? 'bg-emerald-500 text-black'
                                : isOptSelected
                                ? 'bg-[#ff3b30] text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {key}
                            </span>
                            <span className="flex-1">{value}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Inputs Summary */}
                  <div className="p-3 bg-[#090b0e] rounded-md border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{language === 'hi' ? 'ड्राइवर विकल्प:' : 'Driver Input:'}</span>
                      <span className={`font-mono font-bold ${isCorrect ? 'text-emerald-400' : isUnattempted ? 'text-slate-600' : 'text-[#ff3b30]'}`}>
                        {userAns || (language === 'hi' ? '[कोई इनपुट नहीं]' : '[No input]')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{language === 'hi' ? 'लक्ष्य Apex (सही उत्तर):' : 'Target Apex (Correct):'}</span>
                      <span className="font-mono font-bold text-emerald-400">{q.correct_answer}</span>
                    </div>
                  </div>

                  {/* Diagnostics advice block */}
                  <div className="p-4 bg-[#090b0e] border-l-4 border-blue-500 rounded-r flex flex-col gap-1 text-xs">
                    <h5 className="font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {analysis.adviceTitle}
                    </h5>
                    <p className="text-slate-300 leading-relaxed mt-1">{analysis.adviceText}</p>
                    <p className="font-extrabold text-blue-400 mt-2">{analysis.actionable}</p>
                  </div>

                  {/* Explanations log */}
                  <div className="pt-3 border-t border-slate-800/80 text-xs">
                    <span className="font-black text-slate-500 uppercase tracking-widest block mb-1">
                      {language === 'hi' ? 'टेलीमेट्री डेटा स्पष्टीकरण' : 'SECTOR EXPLANATION DATA'}
                    </span>
                    <p className="text-slate-400 leading-relaxed">{q.explanation}</p>
                  </div>

                  {/* Ask AI chat toggle button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveChatId(activeChatId === q.id ? null : q.id)}
                      className={`px-4 py-2 border rounded text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                        activeChatId === q.id
                          ? 'bg-[#ff3b30] border-[#ff3b30] text-white'
                          : 'border-slate-800 hover:border-blue-500 text-slate-400 hover:text-blue-400'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {activeChatId === q.id
                        ? (language === 'hi' ? 'ट्यूनिंग बंद करें' : 'Close Radio')
                        : (language === 'hi' ? 'एआई को-ड्राइवर से बात करें' : 'Open Team Radio')}
                    </button>
                  </div>

                  {/* Chat interface */}
                  <AnimatePresence>
                    {activeChatId === q.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <QuestionChat
                          question={q}
                          selectedAnswer={userAns || (language === 'hi' ? '[कोई उत्तर नहीं]' : '[No Answer]')}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer Navigation Actions ── */}
        <div className="pt-10 border-t border-slate-800/80 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-8 py-4 bg-[#ff3b30] text-white font-black rounded-md hover:bg-red-600 transition-all cursor-pointer text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(255,59,48,0.3)]"
          >
            <RefreshCw className="w-4 h-4" />
            {language === 'hi' ? 'लैप पुनः प्रारंभ करें' : 'Restart Lap'}
          </button>
          
          <button
            onClick={handleBackToSubjects}
            className="flex items-center gap-2 px-8 py-4 bg-transparent text-slate-300 font-black border-2 border-slate-800 hover:border-slate-600 rounded-md text-xs uppercase tracking-wider cursor-pointer transition-colors"
          >
            {language === 'hi' ? 'विषयों की ग्रिड' : 'Return to grid'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
