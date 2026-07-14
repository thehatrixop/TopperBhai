'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { OwlSpeech, SpeedLine, ComicActionButton } from '@/components/manga-ui'
import { 
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Info,
  AlertTriangle,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileText,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { API_BASE_URL } from '@/lib/config'
import { GradingResultSkeleton } from '@/components/Skeleton'

interface RubricEval {
  criterion: string
  score_awarded: number
  max_score: number
  comment: string
}

interface ScribeGradingResponse {
  score: number
  max_score: number
  transcription: string
  diagram_check: string
  rubrics_eval: RubricEval[]
  feedback: string
}

const SAMPLE_TEMPLATES = [
  {
    title: 'Database Schema Diagram',
    question: 'Draw a Relational Database Schema showing a many-to-many relationship between Users and Groups using a Junction Table.',
    rubrics: '1. Presence of Users, Groups, and UserGroups tables (2 marks)\n2. Proper foreign keys and primary keys defined (2 marks)\n3. Correct lines/arrows showing 1-to-many relationship mapping (2 marks)\n4. Attributes like user_id, group_id clearly marked (4 marks)'
  },
  {
    title: 'TCP 3-Way Handshake',
    question: 'Explain and sketch the sequence of messages in a TCP Three-Way Handshake.',
    rubrics: '1. Correct sequence of messages: SYN, SYN-ACK, ACK (3 marks)\n2. Correct direction of arrows between Client and Server (3 marks)\n3. Proper labeling of packet flags and sequence numbers (4 marks)'
  }
]

export default function GradingDojoPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Input states
  const [question, setQuestion] = useState('')
  const [rubrics, setRubrics] = useState('')
  const [rubricMode, setRubricMode] = useState<'auto' | 'manual'>('auto')
  const [maxMarks, setMaxMarks] = useState<number>(10)
  const [gradingRigor, setGradingRigor] = useState<'standard' | 'strict' | 'lenient'>('standard')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [customGuidelines, setCustomGuidelines] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter(a => a !== area))
    } else {
      setFocusAreas([...focusAreas, area])
    }
  }

  // API response states
  const [loading, setLoading] = useState(false)
  const [gradingResult, setGradingResult] = useState<ScribeGradingResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<'rubrics' | 'diagram' | 'transcription' | null>('rubrics')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      if (fileExt && ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt)) {
        setSelectedFile(file)
        setImagePreviewUrl(URL.createObjectURL(file))
        setErrorMsg('')
      } else {
        setErrorMsg('Unsupported file type. Please upload a PNG, JPG, JPEG, or WEBP image.')
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      if (fileExt && ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt)) {
        setSelectedFile(file)
        setImagePreviewUrl(URL.createObjectURL(file))
        setErrorMsg('')
      } else {
        setErrorMsg('Unsupported file type. Please upload a PNG, JPG, JPEG, or WEBP image.')
      }
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setImagePreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const selectTemplate = (tpl: typeof SAMPLE_TEMPLATES[0]) => {
    setQuestion(tpl.question)
    setRubrics(tpl.rubrics)
    setRubricMode('manual')
  }

  const handleGradeSubjective = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let finalRubrics = 'auto'
    if (rubricMode === 'manual') {
      finalRubrics = rubrics.trim()
    } else {
      // Construct AI grading instruction prompt based on user settings
      const isDefaultAuto = maxMarks === 10 && gradingRigor === 'standard' && focusAreas.length === 0 && !customGuidelines.trim()
      if (!isDefaultAuto) {
        const promptParts = [
          `dynamically generate standard grading criteria adding up to ${maxMarks} marks.`,
          `Use a ${gradingRigor} grading approach: ${
            gradingRigor === 'strict' 
              ? 'Assess with high rigor, checking details, labels, exact terminology, and formulas meticulously.' 
              : gradingRigor === 'lenient' 
              ? 'Focus on conceptual understanding and logical flow, awarding partial marks generously even if minor errors are present.' 
              : 'Maintain standard academic grading rigor, balancing conceptual understanding with technical accuracy.'
          }`
        ]

        if (focusAreas.length > 0) {
          promptParts.push(`Pay extra attention to: ${focusAreas.join(', ')}.`)
        }

        if (customGuidelines.trim()) {
          promptParts.push(`Additional AI Guidelines: ${customGuidelines.trim()}`)
        }

        finalRubrics = promptParts.join(' ')
      }
    }

    if (!question.trim() || !finalRubrics || !selectedFile) {
      setErrorMsg('Please provide a question, rubrics (if manual mode), and upload your handwritten answer sheet.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setGradingResult(null)

    const formData = new FormData()
    formData.append('question', question)
    formData.append('rubrics', finalRubrics)
    formData.append('file', selectedFile)
    formData.append('target_language', language === 'hi' ? 'Hindi' : 'English')

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/scribe/grade-subjective`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to grade sheet. Please ensure the backend is running and valid API keys are configured.')
      }

      const data = await response.json()
      // Simulate artificial delay to see the skeleton loading
      await new Promise(resolve => setTimeout(resolve, 2000))
      setGradingResult(data)

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'An error occurred while grading the subjective paper.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setQuestion('')
    setRubrics('')
    setRubricMode('auto')
    setMaxMarks(10)
    setGradingRigor('standard')
    setFocusAreas([])
    setCustomGuidelines('')
    setSelectedFile(null)
    setImagePreviewUrl(null)
    setGradingResult(null)
    setErrorMsg('')
  }

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
              { name: t('nav.scribe'), href: '/features/scribe-dojo', active: false },
              { name: t('nav.grading'), href: '/features/grading-dojo', active: true },
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
              className="absolute top-full left-0 w-full border-b border-topper-graphite/40 overflow-hidden z-[9999] lg:hidden shadow-2xl"
              style={{ backgroundColor: '#1a1a1a' }}
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
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-500 blur-xl opacity-40 scale-125 animate-pulse" />
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
              className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-900 via-teal-600 to-emerald-400 shadow-[0_0_40px_rgba(0,217,255,0.5),inset_-8px_-8px_25px_rgba(0,0,0,0.8),inset_8px_8px_15px_rgba(255,255,255,0.4)] border border-cyan-500/20"
            >
              <div className="absolute top-2 left-4 w-5 h-2.5 rounded-full bg-white/30 blur-[0.5px] rotate-[-15deg]" />
            </motion.div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-balance max-w-xl">
            {t('grading.title').split(' ')[0]} <span className="text-topper-amber">{t('grading.title').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-sm md:text-base text-topper-off-white/80 mt-2 max-w-md">
            {t('grading.subtitle')}
          </p>
        </div>

        {/* Central Dual Input Panel */}
        {!gradingResult && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full bg-topper-charcoal border-2 border-topper-graphite rounded-xl overflow-hidden p-5 md:p-6 shadow-[6px_6px_0_rgba(0,0,0,0.4)] relative mb-8"
          >
            <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />

            <form onSubmit={handleGradeSubjective} className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                  {t('grading.question.label')}
                </label>
                <textarea
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t('grading.question.placeholder')}
                  className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg p-3 text-sm text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors resize-y font-medium leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                  {t('grading.mode.label')}
                </label>
                <div className="flex bg-topper-black border-2 border-topper-graphite rounded-lg p-1 max-w-xs mb-3">
                  <button
                    type="button"
                    onClick={() => setRubricMode('auto')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                      rubricMode === 'auto'
                        ? 'bg-topper-amber text-topper-black shadow-[0_0_10px_rgba(245,166,35,0.2)]'
                        : 'text-topper-graphite hover:text-topper-off-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('grading.mode.auto')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRubricMode('manual')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                      rubricMode === 'manual'
                        ? 'bg-topper-amber text-topper-black shadow-[0_0_10px_rgba(245,166,35,0.2)]'
                        : 'text-topper-graphite hover:text-topper-off-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {t('grading.mode.manual')}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {rubricMode === 'manual' ? (
                  <motion.div
                    key="manual"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                      Grading Rubrics / Ideal Answer
                    </label>
                    <textarea
                      rows={4}
                      value={rubrics}
                      onChange={(e) => setRubrics(e.target.value)}
                      placeholder="Describe the rubric rules or provide the ideal points to grade against..."
                      className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg p-3 text-sm text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors resize-y font-medium leading-relaxed"
                      required={rubricMode === 'manual'}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="auto"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 bg-topper-black/10 border border-topper-graphite/40 rounded-xl p-4"
                  >
                    {/* Header Banner */}
                    <div className="p-3 bg-topper-black/30 border border-dashed border-topper-graphite/60 rounded-lg flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-topper-amber flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-topper-off-white">{t('grading.auto.info.title')}</p>
                        <p className="text-[11px] text-topper-graphite mt-0.5 leading-normal">
                          {t('grading.auto.info.desc')}
                        </p>
                      </div>
                    </div>

                    {/* Max Marks Selection */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                        {language === 'en' ? 'Total Marks (Max Score)' : 'कुल अंक (अधिकतम स्कोर)'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[5, 10, 15, 20, 50, 100].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setMaxMarks(val)}
                            className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${
                              maxMarks === val
                                ? 'bg-topper-amber text-topper-black border-topper-amber shadow-[0_0_8px_rgba(245,166,35,0.15)]'
                                : 'bg-topper-black text-topper-off-white border-topper-graphite hover:border-topper-amber/50'
                            }`}
                          >
                            {val} {language === 'en' ? 'Marks' : 'अंक'}
                          </button>
                        ))}
                        <input
                          type="number"
                          placeholder={language === 'en' ? 'Custom' : 'कस्टम'}
                          value={maxMarks === 5 || maxMarks === 10 || maxMarks === 15 || maxMarks === 20 || maxMarks === 50 || maxMarks === 100 ? '' : maxMarks}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val) && val > 0) setMaxMarks(val)
                          }}
                          className="w-20 bg-topper-black border border-topper-graphite hover:border-topper-amber/50 rounded px-2.5 py-1 text-xs text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 font-bold text-center"
                        />
                      </div>
                    </div>

                    {/* Grading Rigor Selection */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                        {language === 'en' ? 'Grading Rigor / Tone' : 'मूल्यांकन कठोरता / टोन'}
                      </label>
                      <div className="flex bg-topper-black border border-topper-graphite rounded-lg p-1 max-w-sm">
                        {[
                          { id: 'lenient', label: language === 'en' ? 'Lenient' : 'उदार' },
                          { id: 'standard', label: language === 'en' ? 'Standard' : 'मानक' },
                          { id: 'strict', label: language === 'en' ? 'Strict' : 'सख्त' }
                        ].map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setGradingRigor(style.id as any)}
                            className={`flex-1 py-1 text-xs font-bold rounded transition-all ${
                              gradingRigor === style.id
                                ? 'bg-topper-amber text-topper-black shadow-[0_0_10px_rgba(245,166,35,0.2)]'
                                : 'text-topper-graphite hover:text-topper-off-white'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grading Focus Checkboxes */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                        {language === 'en' ? 'Grading Focus Areas (Optional)' : 'मूल्यांकन फोकस क्षेत्र (वैकल्पिक)'}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { id: 'diagrams', label: language === 'en' ? 'Diagram details & labels' : 'आरेख विवरण और लेबल' },
                          { id: 'working', label: language === 'en' ? 'Mathematical/logical proofs' : 'गणितीय/तार्किक हल' },
                          { id: 'readability', label: language === 'en' ? 'Handwriting readability' : 'हस्तलेखन की पठनीयता' }
                        ].map((focus) => {
                          const isSelected = focusAreas.includes(focus.label)
                          return (
                            <button
                              key={focus.id}
                              type="button"
                              onClick={() => toggleFocusArea(focus.label)}
                              className={`p-2 text-left rounded border-2 text-xs font-bold transition-all flex flex-col justify-between h-14 ${
                                isSelected
                                  ? 'bg-topper-amber/10 border-topper-amber text-topper-amber shadow-[0_0_8px_rgba(245,166,35,0.1)]'
                                  : 'bg-topper-black/40 border-topper-graphite text-topper-graphite hover:border-topper-graphite/80 hover:text-topper-off-white'
                              }`}
                            >
                              <span>{focus.label}</span>
                              <span className={`text-[8px] uppercase tracking-wider font-extrabold ${isSelected ? 'text-topper-amber' : 'text-topper-graphite'}`}>
                                {isSelected ? (language === 'en' ? '✓ Added' : '✓ जोड़ा गया') : (language === 'en' ? '+ Add' : '+ जोड़ें')}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Custom Guidelines */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                        {language === 'en' ? 'Additional AI Instructions (Optional)' : 'अतिरिक्त AI निर्देश (वैकल्पिक)'}
                      </label>
                      <textarea
                        rows={2}
                        value={customGuidelines}
                        onChange={(e) => setCustomGuidelines(e.target.value)}
                        placeholder={language === 'en' ? 'e.g. Ignore spelling mistakes. Award extra credit for clear layout.' : 'उदा. वर्तनी की अशुद्धियों को अनदेखा करें। स्पष्ट लेआउट के लिए अतिरिक्त अंक दें।'}
                        className="w-full bg-topper-black border-2 border-topper-graphite rounded-lg p-2 text-xs text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber/70 transition-colors resize-y font-medium leading-relaxed"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Section */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-topper-graphite mb-2">
                  {t('grading.sheet.label')}
                </label>
                
                {!imagePreviewUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-topper-graphite hover:border-topper-amber/70 rounded-lg p-8 text-center cursor-pointer transition-colors bg-topper-black/30 flex flex-col items-center justify-center group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 text-topper-graphite group-hover:text-topper-amber transition-colors mb-3" />
                    <p className="text-sm font-bold text-topper-off-white group-hover:text-topper-amber/90 transition-colors">
                      {t('grading.upload.placeholder')}
                    </p>
                    <p className="text-xs text-topper-graphite mt-1">
                      {t('grading.upload.formats')}
                    </p>
                  </div>
                ) : (
                  <div className="relative border-2 border-topper-graphite rounded-lg p-4 bg-topper-black/50 flex flex-col items-center">
                    <img 
                      src={imagePreviewUrl} 
                      alt="Uploaded solution sheet" 
                      className="max-h-72 object-contain rounded-md shadow-lg"
                    />
                    <div className="absolute top-6 right-6 flex gap-2">
                      <button
                        type="button"
                        onClick={removeFile}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full shadow-md transition-colors"
                        title={language === 'en' ? 'Remove image' : 'छवि हटाएं'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-topper-graphite mt-2 font-mono">
                      {selectedFile?.name} ({(selectedFile!.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="bg-red-950/40 border border-red-800 rounded p-3 text-xs text-red-400 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <ComicActionButton 
                  disabled={loading || !question.trim() || (rubricMode === 'manual' && !rubrics.trim()) || !selectedFile}
                  className="w-full md:w-auto px-8 py-3.5 bg-topper-amber text-topper-black border-2 border-topper-black font-black uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-topper-black" />
                      <span>{t('grading.btn.evaluating')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-topper-black" />
                      <span>{t('grading.btn.evaluate')}</span>
                    </>
                  )}
                </ComicActionButton>
              </div>
            </form>
          </motion.div>
        )}

        {/* Quick-Start Sample Templates */}
        {!gradingResult && !loading && (
          <div className="w-full space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-topper-graphite block text-center select-none">
              {t('grading.demo.header')}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SAMPLE_TEMPLATES.map((tpl, index) => (
                <div
                  key={index}
                  onClick={() => selectTemplate(tpl)}
                  className="bg-topper-charcoal border-2 border-topper-graphite hover:border-topper-amber p-4 rounded-xl shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all cursor-pointer flex flex-col justify-between group select-none relative overflow-hidden"
                >
                  <div className="absolute inset-2 border border-dashed border-topper-graphite/10 group-hover:border-topper-amber/25 pointer-events-none rounded-lg transition-colors" />
                  
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-topper-off-white group-hover:text-topper-amber transition-colors flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-topper-amber" />
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-topper-graphite group-hover:text-topper-off-white/80 transition-colors mt-2 line-clamp-2">
                      Q: {tpl.question}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <GradingResultSkeleton />}
        
        {/* Grading Results Analysis Dashboard */}
        <AnimatePresence>
          {gradingResult && !loading && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full mt-2 space-y-8"
            >
              
              {/* Score banner & Overview Feedback */}
              <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-6 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col md:flex-row items-center gap-6">
                <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                
                {/* Visual circular/badge score */}
                <div className="flex flex-col items-center justify-center p-4 bg-topper-black rounded-lg border border-topper-graphite relative z-10 w-32 h-32 flex-shrink-0">
                  <span className="text-xs text-topper-graphite font-black uppercase tracking-wider">{t('grading.score.label')}</span>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-topper-amber">{gradingResult.score}</span>
                    <span className="text-xl font-bold text-topper-graphite">/{gradingResult.max_score}</span>
                  </div>
                  <span className="text-[10px] text-green-400 mt-1 font-bold">
                    {((gradingResult.score / gradingResult.max_score) * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex-1 relative z-10 text-center md:text-left">
                  <h3 className="text-lg font-black text-topper-off-white mb-2">{t('grading.summary.label')}</h3>
                  <OwlSpeech 
                    message={gradingResult.feedback}
                    position="left"
                    delay={0.1}
                  />
                </div>
              </div>

              {/* Side-by-Side Sheet preview and Detailed breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                
                {/* Paper Image Preview */}
                <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 shadow-[4px_4px_0_rgba(0,0,0,1)] relative flex flex-col min-h-[300px]">
                  <div className="absolute inset-2 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                  <div className="flex items-center gap-2 mb-3 border-b border-topper-graphite pb-2 relative z-10">
                    <ImageIcon className="w-4 h-4 text-topper-amber" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-topper-off-white">{t('grading.submitted.label')}</h3>
                  </div>
                  <div className="flex-1 flex items-center justify-center overflow-hidden rounded-md relative z-10">
                    {imagePreviewUrl && (
                      <img 
                        src={imagePreviewUrl} 
                        alt="Your uploaded solution" 
                        className="max-h-80 w-auto object-contain rounded-md shadow-md"
                      />
                    )}
                  </div>
                </div>

                {/* Rubrics and Transcriptions accordions */}
                <div className="space-y-3">
                  
                  {/* Detailed Rubrics Scorecard */}
                  <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-lg overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'rubrics' ? null : 'rubrics')}
                      className="w-full text-left p-4 flex items-center justify-between font-bold text-sm text-topper-off-white focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-topper-amber" />
                        <span>{t('grading.breakdown.label')}</span>
                      </div>
                      {expandedSection === 'rubrics' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'rubrics' && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-topper-black/30 border-t border-topper-graphite/40"
                        >
                          <div className="p-4 space-y-4">
                            {gradingResult.rubrics_eval.map((item, idx) => (
                              <div key={idx} className="border-b border-topper-graphite/30 last:border-b-0 pb-3 last:pb-0 space-y-1">
                                <div className="flex items-start justify-between gap-4">
                                  <span className="text-xs font-black text-topper-off-white">{item.criterion}</span>
                                  <span className="text-xs font-black text-topper-amber whitespace-nowrap bg-topper-amber/10 border border-topper-amber/20 px-2 py-0.5 rounded">
                                    {item.score_awarded} / {item.max_score}
                                  </span>
                                </div>
                                <p className="text-xs text-topper-graphite leading-relaxed">{item.comment}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Diagram Check Card */}
                  <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-lg overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'diagram' ? null : 'diagram')}
                      className="w-full text-left p-4 flex items-center justify-between font-bold text-sm text-topper-off-white focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-topper-amber" />
                        <span>{t('grading.diagram.label')}</span>
                      </div>
                      {expandedSection === 'diagram' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'diagram' && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-topper-black/30 border-t border-topper-graphite/40"
                        >
                          <div className="p-4 text-xs text-topper-off-white/80 leading-relaxed flex gap-2">
                            <Info className="w-4 h-4 text-topper-amber flex-shrink-0 mt-0.5" />
                            <p>{gradingResult.diagram_check}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Text Transcription Card */}
                  <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-lg overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'transcription' ? null : 'transcription')}
                      className="w-full text-left p-4 flex items-center justify-between font-bold text-sm text-topper-off-white focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-topper-amber" />
                        <span>{t('grading.transcription.label')}</span>
                      </div>
                      {expandedSection === 'transcription' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedSection === 'transcription' && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-topper-black/30 border-t border-topper-graphite/40"
                        >
                          <div className="p-4 text-xs text-topper-off-white/80 leading-relaxed font-mono whitespace-pre-wrap">
                            {gradingResult.transcription || 'No text transcribed.'}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

              </div>

              {/* Reset/Grade Another Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 border-2 border-topper-graphite hover:border-topper-amber/70 rounded-xl font-black uppercase text-xs tracking-wider transition-colors bg-topper-charcoal shadow-[3px_3px_0_#000] active:translate-y-[2px]"
                >
                  {t('grading.btn.reset')}
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

    </div>
  )
}
