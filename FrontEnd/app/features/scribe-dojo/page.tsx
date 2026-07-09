'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { OwlSpeech, SpeedLine, ComicActionButton } from '@/components/manga-ui'
import { 
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BookOpen,
  Info,
  CheckCircle,
  AlertTriangle,
  FileText,
  Menu,
  X,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  Edit,
  Wand2
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { ScribeResultSkeleton } from '@/components/Skeleton'

interface Correction {
  original_part: string
  corrected_part: string
  rule_category: string
  explanation: string
}

interface GrammarCheckResponse {
  corrected_text: string
  overall_feedback: string
  corrections: Correction[]
  suggestions: string[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const EXAMPLES = [
  {
    title: 'Leave Application',
    context: 'Leave Application',
    text: 'dear boss i am writing this mail to tell you that i am sick and cannot come to office today please grant me leave i will do my work tomorrow thanks',
    description: 'Sickness leave request to employer'
  },
  {
    title: 'Meeting Reschedule',
    context: 'Meeting Reschedule',
    text: 'hi we need to reschedule our meeting tomorrow because something came up i am free on wednesday morning does that work for you let me know',
    description: 'Rescheduling a calendar event'
  },
  {
    title: 'Formal Mail',
    context: 'Formal Mail',
    text: 'respected sir i am sending the report that you asked yesterday please check it and tell me if there are any changes required in it',
    description: 'Project status report submission'
  }
]

// Custom Diff Highlighting function that splits words and matches edits
function highlightDiff(original: string, corrected: string, corrections: Correction[]) {
  if (!corrections || corrections.length === 0) {
    return { originalHTML: <span>{original}</span>, correctedHTML: <span>{corrected}</span> }
  }

  // Sort corrections by original part length descending to avoid sub-string replacement issues
  const sortedCorrections = [...corrections].sort((a, b) => b.original_part.length - a.original_part.length)

  // Highlight Original Text (Red / Line-through)
  const highlightOriginal = (text: string) => {
    const originalParts = sortedCorrections.map(c => c.original_part).filter(Boolean)
    if (originalParts.length === 0) return <span>{text}</span>

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = originalParts.map(escapeRegExp).join('|')
    const regex = new RegExp(`(${pattern})`, 'gi')
    const segments = text.split(regex)

    return (
      <>
        {segments.map((segment, index) => {
          const match = originalParts.find(p => p.toLowerCase() === segment.toLowerCase())
          if (match) {
            return (
              <span 
                key={index} 
                className="bg-red-500/25 border-b-2 border-red-500 text-red-200 px-1 rounded-sm mx-0.5 line-through decoration-red-400 font-medium select-none"
                title={`Should be corrected`}
              >
                {segment}
              </span>
            )
          }
          return segment
        })}
      </>
    )
  }

  // Highlight Corrected Text (Green / Bold)
  const highlightCorrected = (text: string) => {
    const correctedParts = sortedCorrections.map(c => c.corrected_part).filter(Boolean)
    if (correctedParts.length === 0) return <span>{text}</span>

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = correctedParts.map(escapeRegExp).join('|')
    const regex = new RegExp(`(${pattern})`, 'gi')
    const segments = text.split(regex)

    return (
      <>
        {segments.map((segment, index) => {
          const match = correctedParts.find(p => p.toLowerCase() === segment.toLowerCase())
          if (match) {
            return (
              <span 
                key={index} 
                className="bg-green-500/20 border-b-2 border-green-500 text-green-200 px-1.5 py-0.5 rounded-sm mx-0.5 font-bold shadow-sm"
              >
                {segment}
              </span>
            )
          }
          return segment
        })}
      </>
    )
  }

  return {
    originalHTML: highlightOriginal(original),
    correctedHTML: highlightCorrected(corrected)
  }
}

export default function ScribeDojoPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Input states
  const [draftText, setDraftText] = useState('')
  const [context, setContext] = useState('')

  // API response states
  const [loading, setLoading] = useState(false)
  const [checkResponse, setCheckResponse] = useState<GrammarCheckResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Expandable corrections state
  const [expandedCorrectionIndex, setExpandedCorrectionIndex] = useState<number | null>(null)

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  const resultsRef = useRef<HTMLDivElement>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'coach' | 'wizard'>('coach')

  // Draft Wizard states
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [letterPurpose, setLetterPurpose] = useState('')
  interface WizardField {
    key: string
    label: string
    type: 'text' | 'date' | 'number' | 'textarea'
    placeholder: string
    required: boolean
  }
  const [wizardFields, setWizardFields] = useState<WizardField[]>([])
  const [wizardFieldsData, setWizardFieldsData] = useState<Record<string, string>>({})
  const [generatedLetter, setGeneratedLetter] = useState<{ subject: string; body: string } | null>(null)
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardError, setWizardError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGetWizardFields = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!letterPurpose.trim()) return

    setWizardLoading(true)
    setWizardError('')
    try {
      const response = await fetch('http://localhost:8000/api/v1/grammar/letter-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ purpose: letterPurpose })
      })

      if (!response.ok) {
        throw new Error('Failed to retrieve fields. Please check backend status.')
      }

      const data = await response.json()
      setWizardFields(data.fields || [])
      // Initialize fields data map
      const initialData: Record<string, string> = {}
      if (data.fields) {
        data.fields.forEach((field: WizardField) => {
          initialData[field.key] = ''
        })
      }
      setWizardFieldsData(initialData)
      setWizardStep(2)
    } catch (err: any) {
      setWizardError(err.message || 'An error occurred while generating fields.')
    } finally {
      setWizardLoading(false)
    }
  }

  const handleGenerateLetter = async (e: React.FormEvent) => {
    e.preventDefault()
    setWizardLoading(true)
    setWizardError('')
    try {
      const response = await fetch('http://localhost:8000/api/v1/grammar/letter-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purpose: letterPurpose,
          fields_data: wizardFieldsData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate letter draft.')
      }

      const data = await response.json()
      setGeneratedLetter(data)
      setWizardStep(3)
    } catch (err: any) {
      setWizardError(err.message || 'An error occurred while generating letter.')
    } finally {
      setWizardLoading(false)
    }
  }

  const handleCopyToClipboard = () => {
    if (!generatedLetter) return
    const textToCopy = `Subject: ${generatedLetter.subject}\n\n${generatedLetter.body}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRefineInCoach = () => {
    if (!generatedLetter) return
    // Load into Polish mode
    const textToCorrect = `Subject: ${generatedLetter.subject}\n\n${generatedLetter.body}`
    setDraftText(textToCorrect)
    setContext(letterPurpose)
    // Clear wizard state to start fresh next time
    setLetterPurpose('')
    setWizardFields([])
    setWizardFieldsData({})
    setGeneratedLetter(null)
    setWizardStep(1)
    // Switch tab
    setActiveTab('coach')
    setCheckResponse(null) // clear previous analysis to force user to click check
  }

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const selectExample = (ex: typeof EXAMPLES[0]) => {
    setDraftText(ex.text)
    setContext(ex.context)
  }

  const handleCheckGrammar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftText.trim()) return

    setLoading(true)
    setErrorMsg('')
    setCheckResponse(null)
    setChatMessages([]) // Reset chat for new draft check

    const selectedContext = context.trim() || 'General'
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/grammar/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: draftText,
          context: selectedContext || 'General'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze draft. Please check if the backend service is running.')
      }

      const data = await response.json()
      // Simulate artificial delay to see the skeleton loading
      await new Promise(resolve => setTimeout(resolve, 2000))
      setCheckResponse(data)
      
      // Initialize chat coach welcome message
      const welcomeMsg = language === 'en' 
        ? `Welcome to your Scribe Dojo training feedback! I've corrected your draft for the **${selectedContext || 'General'}** context. \n\nReview the highlighted changes above and ask me questions about why any specific rules apply!`
        : `लेखन डोजो प्रशिक्षण प्रतिक्रिया में स्वागत है! मैंने आपके ड्राफ्ट को **${selectedContext || 'सामान्य'}** संदर्भ के लिए ठीक कर दिया है। \n\nकृपया ऊपर हाइलाइट किए गए सुधारों की समीक्षा करें और मुझसे पूछें कि विशिष्ट नियम क्यों लागू होते हैं!`;

      setChatMessages([
        {
          role: 'assistant',
          content: welcomeMsg
        }
      ])

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'An error occurred while connecting to the grammar coach.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !checkResponse || chatLoading) return

    const userMsg = chatInput.trim()
    setChatInput('')

    const nextHistory = [...chatMessages, { role: 'user', content: userMsg } as ChatMessage]
    setChatMessages(nextHistory)
    setChatLoading(true)

    const selectedContext = context.trim() || 'General'

    try {
      const response = await fetch('http://localhost:8000/api/v1/grammar/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          original_text: draftText,
          corrected_text: checkResponse.corrected_text,
          context: selectedContext || 'General',
          corrections_json: JSON.stringify(checkResponse.corrections),
          message: userMsg,
          history: nextHistory.slice(1).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get answer from tutor')
      }

      const data = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'Oops! I had trouble contacting the coach server. Make sure the backend endpoint is active and try again.' 
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // Format tutor markdown response helpers
  function formatTutorResponse(content: string) {
    return content.split('\n').map((line, i) => {
      let key = i
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ')
      let cleanLine = line
      if (isBullet) {
        cleanLine = line.trim().substring(2)
      }
      
      const parts = cleanLine.split(/\*\*(.*?)\*\*/g)
      const renderedLine = parts.map((part, index) => {
        if (index % 2 === 1) {
          return <strong key={index} className="font-extrabold text-topper-amber">{part}</strong>
        }
        return part
      })

      if (isBullet) {
        return (
          <li key={key} className="ml-5 list-disc mb-1 leading-relaxed text-sm text-topper-off-white/90">
            {renderedLine}
          </li>
        )
      }
      
      return (
        <p key={key} className="mb-2 leading-relaxed text-sm text-topper-off-white/90 min-h-[1em]">
          {renderedLine}
        </p>
      )
    })
  }

  const { originalHTML, correctedHTML } = checkResponse 
    ? highlightDiff(draftText, checkResponse.corrected_text, checkResponse.corrections) 
    : { originalHTML: null, correctedHTML: null }

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white flex flex-col justify-between items-center relative overflow-hidden font-sans pb-16">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#161616_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none z-0 opacity-40" />

      {/* Speed lines on loading state */}
      <AnimatePresence>
        {loading && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-15">
            <SpeedLine duration={0.3} />
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Header */}
      <nav className="w-full relative z-50 border-b border-topper-graphite/40 px-6 py-4 md:px-12 flex items-center justify-between bg-topper-black/60 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-2xl font-black tracking-tighter hover:text-topper-amber transition-colors flex items-center gap-2 uppercase">
            <Image src="/topper-owl.png" alt="Logo" width={28} height={28} className="object-contain" />
            {language === 'hi' ? 'टॉपरभाई' : 'TopperBhai'}
          </Link>
          
          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { name: t('nav.focus'), href: '/features/focus-dojo', active: false },
              { name: t('nav.tasks'), href: '/features/task-quest', active: false },
              { name: t('nav.scribe'), href: '/features/scribe-dojo', active: true },
              { name: t('nav.grading'), href: '/features/grading-dojo', active: false },
              { name: t('nav.concept'), href: '/features/concept-dojo', active: false },
              { name: t('nav.planner'), href: '/features/study-planner', active: false }
            ].map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className={`text-[13px] font-bold transition-colors tracking-wide uppercase ${
                  link.active 
                    ? 'text-topper-amber border-b-2 border-topper-amber pb-0.5' 
                    : 'text-topper-off-white/80 hover:text-topper-amber'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side: Language and CTA */}
        <div className="hidden lg:flex items-center gap-4">
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
              {t('success.generatePaper') || 'Generate Paper'}
            </button>
          </Link>
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
                      {t('success.generatePaper') || 'Generate Paper'}
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl px-4 md:px-6 py-12 relative z-10 flex flex-col items-center">
        
        {/* Header with Glowing Sphere */}
        <div className="flex flex-col items-center mb-10 text-center select-none">
          {/* Glowing Glass 3D Sphere */}
          <div className="relative mb-6">
            {/* Sphere glow shadow backdrop */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 blur-xl opacity-40 scale-125 animate-pulse" />
            
            <motion.div
              animate={{
                y: [0, -10, 0],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-800 via-purple-600 to-fuchsia-400 shadow-[0_0_40px_rgba(168,85,247,0.5),inset_-8px_-8px_25px_rgba(0,0,0,0.8),inset_8px_8px_15px_rgba(255,255,255,0.4)] border border-purple-500/20"
            >
      {/* Internal high glass reflection curve */}
              <div className="absolute top-2 left-4 w-5 h-2.5 rounded-full bg-white/30 blur-[0.5px] rotate-[-15deg]" />
            </motion.div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-balance max-w-xl">
            {t('scribe.title').split(' ')[0]} <span className="text-topper-amber">{t('scribe.title').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-sm md:text-base text-topper-off-white/80 mt-2 max-w-md">
            {t('scribe.subtitle')}
          </p>
        </div>

        {/* Modern Tab Bar */}
        <div className="flex bg-topper-charcoal/60 border-2 border-topper-graphite p-1 rounded-full w-full max-w-md mb-8 relative z-10 select-none">
          <button
            onClick={() => setActiveTab('coach')}
            className={`flex-1 py-2 px-4 rounded-full text-xs font-black tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'coach'
                ? 'bg-topper-amber text-topper-black shadow-[0_0_12px_rgba(245,166,35,0.4)]'
                : 'text-topper-off-white/70 hover:text-topper-off-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('scribe.tab.coach') || 'Draft Coach'}
          </button>
          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex-1 py-2 px-4 rounded-full text-xs font-black tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'wizard'
                ? 'bg-topper-amber text-topper-black shadow-[0_0_12px_rgba(245,166,35,0.4)]'
                : 'text-topper-off-white/70 hover:text-topper-off-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {t('scribe.tab.wizard') || 'Draft Wizard'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'coach' ? (
            <motion.div
              key="coach-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center"
            >
              {/* Central dual input panel */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full bg-topper-charcoal border-2 border-topper-graphite rounded-xl overflow-hidden p-5 md:p-6 shadow-[6px_6px_0_rgba(0,0,0,0.4)] relative mb-8"
              >
                {/* Card internal dashed border */}
                <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />

                <form onSubmit={handleCheckGrammar} className="space-y-5 relative z-10">
                  <div>
                    <label htmlFor="draftText" className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                      {t('scribe.draft.label')}
                    </label>
                    <textarea
                      id="draftText"
                      rows={5}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      placeholder={t('scribe.draft.placeholder')}
                      className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg p-3 text-sm text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors resize-y font-medium leading-relaxed"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="writingContext" className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                      {t('scribe.context.label')}
                    </label>
                    <input
                      id="writingContext"
                      type="text"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder={t('scribe.context.placeholder')}
                      className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg px-3 py-3 text-sm text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors font-semibold"
                      autoComplete="off"
                      required
                    />
                  </div>

                  {errorMsg && (
                    <div className="bg-red-950/40 border border-red-800 rounded p-3 text-xs text-red-400 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <ComicActionButton 
                      disabled={loading || !draftText.trim()}
                      className="w-full md:w-auto px-8 py-3.5 bg-topper-amber text-topper-black border-2 border-topper-black font-black uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 animate-spin text-topper-black" />
                          <span>{t('scribe.btn.polishing')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4.5 h-4.5 text-topper-black" />
                          <span>{t('scribe.btn.polish')}</span>
                        </>
                      )}
                    </ComicActionButton>
                  </div>
                </form>
              </motion.div>

              {/* Quick-Start Templates */}
              {!checkResponse && !loading && (
                <div className="w-full space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-topper-graphite block text-center select-none">
                    {t('scribe.examples.header')}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    {EXAMPLES.map((ex, index) => (
                      <div
                        key={index}
                        onClick={() => selectExample(ex)}
                        className="bg-topper-charcoal border-2 border-topper-graphite hover:border-topper-amber p-4 rounded-xl shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all cursor-pointer flex flex-col justify-between h-32 group select-none relative overflow-hidden"
                      >
                        <div className="absolute inset-2 border border-dashed border-topper-graphite/10 group-hover:border-topper-amber/25 pointer-events-none rounded-lg transition-colors" />
                        
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wide text-topper-off-white group-hover:text-topper-amber transition-colors flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-topper-amber" />
                            {ex.title}
                          </h3>
                          <p className="text-[10px] text-topper-graphite group-hover:text-topper-off-white/50 transition-colors mt-0.5">
                            {ex.description}
                          </p>
                        </div>
                        <p className="text-xs text-topper-graphite/80 line-clamp-2 italic group-hover:text-topper-off-white/80 transition-colors pt-2">
                          "{ex.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loading && <ScribeResultSkeleton />}

              {/* Results Analysis Dashboard */}
              <AnimatePresence>
                {checkResponse && !loading && (
                  <motion.div
                    ref={resultsRef}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full mt-10 space-y-8"
                  >
                    
                    {/* Section Divider */}
                    <div className="flex items-center gap-4 select-none">
                      <div className="h-0.5 bg-topper-graphite flex-1" />
                      <span className="text-xs font-black uppercase tracking-widest text-topper-amber">
                        {t('scribe.status.complete')}
                      </span>
                      <div className="h-0.5 bg-topper-graphite flex-1" />
                    </div>

                    {/* Side-by-Side Interactive Diff Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      
                      {/* Draft Panel */}
                      <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col min-h-[220px]">
                        <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                        <div className="flex items-center gap-2 mb-3 border-b border-topper-graphite pb-2 relative z-10 select-none">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-topper-off-white">{t('scribe.original.label')}</h3>
                        </div>
                        <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-topper-off-white/70 overflow-y-auto max-h-[240px] flex-1 relative z-10 pr-1 select-text">
                          {originalHTML}
                        </div>
                      </div>

                      {/* Polished Panel */}
                      <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col min-h-[220px]">
                        <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                        <div className="flex items-center gap-2 mb-3 border-b border-topper-graphite pb-2 relative z-10 select-none">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-topper-off-white">{t('scribe.polished.label')}</h3>
                        </div>
                        <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap text-topper-off-white overflow-y-auto max-h-[240px] flex-1 relative z-10 pr-1 select-text">
                          {correctedHTML}
                        </div>
                      </div>

                    </div>

                    {/* Mascot / Overall Feedback */}
                    <div className="w-full flex justify-center py-2 select-none">
                      <OwlSpeech 
                        message={checkResponse.overall_feedback}
                        position="center"
                        delay={0.1}
                      />
                    </div>

                    {/* Grammar Rule Explanations & Suggestions */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-left">
                      
                      {/* Rules Explanations (Left, 2 columns wide) */}
                      <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-topper-graphite flex items-center gap-2 select-none">
                          <BookOpen className="w-4 h-4 text-topper-amber" />
                          {t('scribe.corrections.title')} ({checkResponse.corrections.length})
                        </h3>
                        
                        {checkResponse.corrections.length === 0 ? (
                          <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-6 text-center shadow-[4px_4px_0_rgba(0,0,0,1)] relative">
                            <div className="absolute inset-2 border border-dashed border-topper-graphite/30 pointer-events-none rounded-lg" />
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2 animate-bounce" />
                            <p className="text-sm font-bold text-topper-off-white">{t('scribe.corrections.perfect')}</p>
                            <p className="text-xs text-topper-graphite mt-1">{t('scribe.corrections.perfect.desc')}</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {checkResponse.corrections.map((corr, idx) => {
                              const isExpanded = expandedCorrectionIndex === idx
                              return (
                                <div 
                                  key={idx}
                                  className="bg-topper-charcoal border-2 border-topper-graphite hover:border-topper-amber rounded-lg overflow-hidden transition-colors shadow-[2px_2px_0_rgba(0,0,0,1)]"
                                >
                                  {/* Accordion Trigger */}
                                  <button
                                    onClick={() => setExpandedCorrectionIndex(isExpanded ? null : idx)}
                                    className="w-full text-left p-4 flex items-center justify-between gap-4 font-semibold text-xs md:text-sm text-topper-off-white focus:outline-none"
                                  >
                                    <div className="flex flex-wrap items-center gap-2.5">
                                      <span className="bg-topper-amber/10 border border-topper-amber/30 text-topper-amber px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider">
                                        {corr.rule_category}
                                      </span>
                                      <span className="text-red-400 line-through truncate max-w-[80px] sm:max-w-[120px]">
                                        {corr.original_part}
                                      </span>
                                      <ArrowRight className="w-3.5 h-3.5 text-topper-graphite" />
                                      <span className="text-green-400 font-bold truncate max-w-[80px] sm:max-w-[120px]">
                                        {corr.corrected_part}
                                      </span>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-4.5 h-4.5 text-topper-graphite" /> : <ChevronDown className="w-4.5 h-4.5 text-topper-graphite" />}
                                  </button>

                                  {/* Accordion Content */}
                                  <AnimatePresence initial={false}>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        exit={{ height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-4 pb-4 pt-1 border-t border-topper-graphite/40 text-xs text-topper-off-white/80 leading-relaxed space-y-2 bg-topper-black/30">
                                          <div className="flex items-start gap-1.5">
                                            <Info className="w-3.5 h-3.5 text-topper-amber mt-0.5 flex-shrink-0" />
                                            <p>{corr.explanation}</p>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Suggestions List (Right, 1 column wide) */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-topper-graphite flex items-center gap-2 select-none">
                          <Sparkles className="w-4 h-4 text-topper-amber" />
                          {t('scribe.suggestions.title')}
                        </h3>
                      
                        <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative space-y-4">
                          <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                          
                          {checkResponse.suggestions.length === 0 ? (
                            <p className="text-xs text-topper-graphite italic text-center py-4">{t('scribe.suggestions.empty')}</p>
                          ) : (
                            <ul className="space-y-3 relative z-10">
                              {checkResponse.suggestions.map((sug, idx) => (
                                <li key={idx} className="flex gap-2 text-xs text-topper-off-white/95 leading-relaxed">
                                  <span className="text-topper-amber select-none">•</span>
                                  <span>{sug}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Chat Coach Console */}
                    <div className="w-full space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-topper-graphite flex items-center gap-2 select-none">
                        <Bot className="w-4.5 h-4.5 text-topper-amber animate-pulse" />
                        {t('scribe.chat.title')}
                      </h3>
                      
                      <div className="border-2 border-topper-graphite rounded-xl bg-topper-charcoal/80 overflow-hidden flex flex-col shadow-[6px_6px_0_rgba(0,0,0,1)] relative">
                        <div className="absolute inset-2 border border-dashed border-topper-graphite/20 pointer-events-none rounded-lg select-none" />
                        
                        {/* Chat Console Header */}
                        <div className="px-4 py-3 bg-topper-graphite/40 border-b border-topper-graphite flex items-center justify-between relative z-10 select-none">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-topper-amber/10 border border-topper-amber/30 flex items-center justify-center text-topper-amber">
                              <Bot className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wide text-topper-off-white">{t('scribe.chat.bot')}</h4>
                              <p className="text-[10px] text-topper-graphite font-bold">{t('scribe.chat.sub')}</p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-topper-amber text-topper-black px-2 py-0.5 rounded font-black uppercase tracking-wider shadow-[1px_1px_0_#000]">
                            {t('scribe.chat.badge')}
                          </span>
                        </div>
                      
                        {/* Chat Console Message Thread */}
                        <div className="p-4 max-h-[350px] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-topper-graphite scrollbar-track-transparent relative z-10 text-left">
                          <AnimatePresence initial={false}>
                            {chatMessages.map((msg, index) => {
                              const isUser = msg.role === 'user'
                              return (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                  {!isUser && (
                                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-topper-amber text-topper-black flex items-center justify-center font-bold shadow-[1px_1px_0_#000] select-none">
                                      <Bot className="w-4.5 h-4.5" />
                                    </div>
                                  )}
                                  
                                  <div
                                    className={`max-w-[85%] p-3 rounded-lg text-topper-off-white border ${
                                      isUser
                                        ? 'bg-topper-graphite/50 border-topper-graphite/80 rounded-tr-none'
                                        : 'bg-topper-black/60 border-topper-graphite/40 rounded-tl-none'
                                    }`}
                                  >
                                    <div className="whitespace-pre-wrap">{formatTutorResponse(msg.content)}</div>
                                  </div>
                      
                                  {isUser && (
                                    <div className="w-7 h-7 flex-shrink-0 rounded-full bg-topper-graphite text-topper-off-white border border-topper-graphite flex items-center justify-center font-bold select-none">
                                      <User className="w-4 h-4" />
                                    </div>
                                  )}
                                </motion.div>
                              )
                            })}
                          </AnimatePresence>
                      
                          {chatLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-3 justify-start"
                            >
                              <div className="w-7 h-7 flex-shrink-0 rounded-full bg-topper-amber text-topper-black flex items-center justify-center font-bold shadow-[1px_1px_0_#000] select-none">
                                <Bot className="w-4.5 h-4.5" />
                              </div>
                              <div className="bg-topper-black/60 border border-topper-graphite/40 max-w-[85%] p-3 rounded-lg flex items-center gap-2 text-topper-graphite text-xs">
                                <Loader2 className="w-4.5 h-4.5 animate-spin text-topper-amber" />
                                <span>{t('scribe.chat.loading')}</span>
                              </div>
                            </motion.div>
                          )}
                          
                          <div ref={chatEndRef} />
                        </div>
                      
                        {/* Chat Console Input form */}
                        <form onSubmit={handleSendChatMessage} className="p-3 border-t border-topper-graphite bg-topper-black/40 flex items-center gap-2 relative z-10">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={chatLoading}
                            placeholder={t('scribe.chat.placeholder')}
                            className="flex-1 bg-topper-black border border-topper-graphite text-topper-off-white text-xs px-3.5 py-3 rounded-lg focus:outline-none focus:border-topper-amber/70 placeholder-topper-graphite transition-colors font-medium"
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="submit"
                            disabled={!chatInput.trim() || chatLoading}
                            className="p-3 rounded-lg bg-topper-amber text-topper-black disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center font-bold shadow-[2px_2px_0_#000] active:translate-y-0 border-2 border-topper-black cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </motion.button>
                        </form>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="wizard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center"
            >
              {wizardStep === 1 && (
                <div className="w-full bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 md:p-6 shadow-[6px_6px_0_rgba(0,0,0,0.4)] relative">
                  <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                  <form onSubmit={handleGetWizardFields} className="space-y-6 relative z-10 text-left">
                    <div>
                      <label htmlFor="letterPurpose" className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                        What is the purpose of this letter/message?
                      </label>
                      <input
                        id="letterPurpose"
                        type="text"
                        value={letterPurpose}
                        onChange={(e) => setLetterPurpose(e.target.value)}
                        placeholder="e.g. Leave application to HOD, Sick leave to boss, Reschedule client meeting..."
                        className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg px-3 py-3 text-sm text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors font-semibold"
                        required
                        autoComplete="off"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-widest text-topper-graphite block">
                        Quick Suggestions
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Sick Leave Application',
                          'Rescheduling Meeting',
                          'Course Waiver Request',
                          'Recommendation Letter',
                          'Formal Complaint'
                        ].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setLetterPurpose(sug)}
                            className="bg-topper-black/40 border border-topper-graphite hover:border-topper-amber text-xs font-bold text-topper-off-white/80 hover:text-topper-off-white px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {wizardError && (
                      <div className="bg-red-950/40 border border-red-800 rounded p-3 text-xs text-red-400 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{wizardError}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <ComicActionButton
                        disabled={wizardLoading || !letterPurpose.trim()}
                        className="w-full md:w-auto px-8 py-3.5 bg-topper-amber text-topper-black border-2 border-topper-black font-black uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        {wizardLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-topper-black" />
                            <span>Fetching Requirements...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4 text-topper-black" />
                            <span>Continue</span>
                          </>
                        )}
                      </ComicActionButton>
                    </div>
                  </form>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="w-full bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 md:p-6 shadow-[6px_6px_0_rgba(0,0,0,0.4)] relative">
                  <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                  <form onSubmit={handleGenerateLetter} className="space-y-6 relative z-10 text-left">
                    <div className="flex items-center gap-3 border-b border-topper-graphite pb-3">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="p-1.5 hover:bg-topper-black rounded-lg transition-colors border border-transparent hover:border-topper-graphite cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-topper-amber" />
                      </button>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wide text-topper-amber">
                          Required Information
                        </h2>
                        <p className="text-[10px] text-topper-graphite font-bold">
                          For: {letterPurpose}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {wizardFields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-topper-off-white/80">
                            {field.label} {field.required && <span className="text-red-400">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={wizardFieldsData[field.key] || ''}
                              onChange={(e) => setWizardFieldsData({ ...wizardFieldsData, [field.key]: e.target.value })}
                              placeholder={field.placeholder}
                              required={field.required}
                              rows={3}
                              className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg p-3 text-sm text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors resize-y font-medium"
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={wizardFieldsData[field.key] || ''}
                              onChange={(e) => setWizardFieldsData({ ...wizardFieldsData, [field.key]: e.target.value })}
                              placeholder={field.placeholder}
                              required={field.required}
                              className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg px-3 py-2.5 text-sm text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors font-medium"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {wizardError && (
                      <div className="bg-red-950/40 border border-red-800 rounded p-3 text-xs text-red-400 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{wizardError}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-6 py-3 border-2 border-topper-graphite hover:border-topper-amber text-xs font-black uppercase tracking-wider text-topper-off-white rounded-lg transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <ComicActionButton
                        disabled={wizardLoading}
                        className="px-8 py-3.5 bg-topper-amber text-topper-black border-2 border-topper-black font-black uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        {wizardLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-topper-black" />
                            <span>Drafting Letter...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 text-topper-black" />
                            <span>Draft Letter</span>
                          </>
                        )}
                      </ComicActionButton>
                    </div>
                  </form>
                </div>
              )}

              {wizardStep === 3 && generatedLetter && (
                <div className="w-full space-y-6">
                  <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 md:p-6 shadow-[6px_6px_0_rgba(0,0,0,0.4)] relative text-left">
                    <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="border-b border-topper-graphite pb-3">
                        <h2 className="text-xs font-black uppercase tracking-widest text-topper-amber mb-1.5">
                          Subject
                        </h2>
                        <p className="text-sm font-bold text-topper-off-white select-text">
                          {generatedLetter.subject}
                        </p>
                      </div>

                      <div>
                        <h2 className="text-xs font-black uppercase tracking-widest text-topper-amber mb-1.5">
                          Body
                        </h2>
                        <div className="bg-topper-black/60 border border-topper-graphite/60 rounded-lg p-4 font-mono text-xs md:text-sm text-topper-off-white leading-relaxed whitespace-pre-wrap select-text max-h-[300px] overflow-y-auto">
                          {generatedLetter.body}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 justify-center relative z-10">
                    <button
                      onClick={handleCopyToClipboard}
                      className="px-6 py-3 bg-topper-graphite border-2 border-topper-black hover:border-topper-amber text-xs font-black uppercase tracking-wider text-topper-off-white rounded-lg transition-all flex items-center gap-2 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000] cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Draft</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleRefineInCoach}
                      className="px-6 py-3 bg-topper-amber border-2 border-topper-black hover:bg-topper-amber/90 text-xs font-black uppercase tracking-wider text-topper-black rounded-lg transition-all flex items-center gap-2 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000] cursor-pointer"
                    >
                      <Edit className="w-4 h-4 text-topper-black" />
                      <span>Refine in Coach</span>
                    </button>

                    <button
                      onClick={() => {
                        setLetterPurpose('')
                        setWizardFields([])
                        setWizardFieldsData({})
                        setGeneratedLetter(null)
                        setWizardStep(1)
                      }}
                      className="px-6 py-3 border-2 border-topper-graphite hover:border-topper-amber text-xs font-black uppercase tracking-wider text-topper-off-white rounded-lg transition-all shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000] cursor-pointer"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </main>

    </div>
  )
}
