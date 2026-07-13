'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { OwlSpeech, ComicActionButton, MangaPanel } from '@/components/manga-ui'
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Menu, 
  X,
  FileText,
  Calendar,
  Sparkles,
  BookOpen,
  Loader2
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { StudyPlanSkeleton } from '@/components/Skeleton'
import { API_BASE_URL } from '@/lib/config'

interface StudyTask {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  estimated_hours: number
  completed: boolean
}

interface WeekPlan {
  week_number: number
  theme: string
  tasks: StudyTask[]
}

interface StudyPlan {
  plan_name: string
  weekly_tasks: WeekPlan[]
}

export default function StudyPlannerPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Study Plan states
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [genStep, setGenStep] = useState(0)

  // Form states
  const [examName, setExamName] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState(4)
  const [durationMonths, setDurationMonths] = useState(3)
  const [prioritySubjects, setPrioritySubjects] = useState('')
  const [notes, setNotes] = useState('')
  const [reminderTime, setReminderTime] = useState('21:00')
  const [syncTaskQuest, setSyncTaskQuest] = useState(true)

  // Load state from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('activeStudyPlan')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setPlan(parsed)
        if (parsed.reminder_time) {
          setReminderTime(parsed.reminder_time)
        }
        if (parsed.sync_task_quest !== undefined) {
          setSyncTaskQuest(parsed.sync_task_quest)
        }
      } catch (e) {
        console.error("Failed to parse stored active study plan", e)
      }
    }
  }, [])

  // Upload states
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Accordion status
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true })

  // Steps sequence text
  const loadingSteps = [
    language === 'hi' ? 'परीक्षा के दायरे का विश्लेषण किया जा रहा है...' : 'Analyzing exam domain scope...',
    language === 'hi' ? 'दैनिक अध्ययन आवंटन की गणना की जा रही है...' : 'Calculating daily study limits...',
    language === 'hi' ? 'AI कोच के साथ विषयों को प्राथमिकता दी जा रही है...' : 'Prioritizing subjects with AI coach...',
    language === 'hi' ? 'साप्ताहिक कार्यों को अंतिम रूप दिया जा रहा है...' : 'Formatting weekly study checklist...'
  ]

  // Fetch AI Plan
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examName.trim() || !prioritySubjects.trim()) return

    setIsLoading(true)
    setUploadError(null)
    setGenStep(0)

    // Simulate multi-phase progression text for premium look
    const timer1 = setTimeout(() => setGenStep(1), 1000)
    const timer2 = setTimeout(() => setGenStep(2), 2200)
    const timer3 = setTimeout(() => setGenStep(3), 3500)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/study-plan/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_name: examName.trim(),
          duration_months: durationMonths,
          hours_per_day: hoursPerDay,
          priority_subjects: prioritySubjects.trim(),
          additional_info: notes.trim() || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Server error")
      }

      const planData = await response.json()
      // Simulate artificial delay to see the step progression & skeleton loading
      await new Promise(resolve => setTimeout(resolve, 4000))
      planData.plan_id = `plan_${Date.now()}`
      planData.reminder_time = reminderTime
      planData.sync_task_quest = syncTaskQuest
      
      if (syncTaskQuest) {
        let plans = []
        try {
          plans = JSON.parse(localStorage.getItem('activeStudyPlans') || '[]')
        } catch (e) {}
        if (plans.length >= 3) {
          alert(language === 'hi' ? "सीमा समाप्त: अधिकतम 3 सक्रिय अध्ययन योजनाएं हो सकती हैं। कृपया पहले एक को हटाएं।" : "Limit reached: You can have at most 3 active study plans synced. Please delete one in Task Quest first.")
          setIsLoading(false)
          return
        }
        plans.push(planData)
        localStorage.setItem('activeStudyPlans', JSON.stringify(plans))
        localStorage.setItem('activeStudyPlan', JSON.stringify(planData))
      }
      setPlan(planData)
      
      // Auto expand week 1
      setExpandedWeeks({ 1: true })
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || "Failed to generate plan. Please try again.")
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      setIsLoading(false)
    }
  }

  // Handle File upload resume
  const handlePlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string)
        if (data && data.plan_name && Array.isArray(data.weekly_tasks)) {
          if (!data.plan_id) {
            data.plan_id = `plan_${Date.now()}`
          }
          if (!data.reminder_time) {
            data.reminder_time = '21:00'
          }
          if (data.sync_task_quest === undefined) {
            data.sync_task_quest = true
          }
          
          let uploadSyncSuccess = true
          if (data.sync_task_quest) {
            let plans = []
            try {
              plans = JSON.parse(localStorage.getItem('activeStudyPlans') || '[]')
            } catch (e) {}
            const index = plans.findIndex((p: any) => p.plan_id === data.plan_id)
            if (index >= 0) {
              plans[index] = data
            } else {
              if (plans.length >= 3) {
                alert(language === 'hi' ? "अपलोड सीमा: 3 से अधिक योजनाएं सिंक नहीं की जा सकतीं। यह योजना केवल इस सत्र में दिखाई देगी।" : "Upload limit: Cannot sync more than 3 active plans. This plan will load in view-only mode for this session.")
                data.sync_task_quest = false
                uploadSyncSuccess = false
              } else {
                plans.push(data)
              }
            }
            if (uploadSyncSuccess) {
              localStorage.setItem('activeStudyPlans', JSON.stringify(plans))
              localStorage.setItem('activeStudyPlan', JSON.stringify(data))
            }
          }
          setPlan(data)
          setSyncTaskQuest(data.sync_task_quest)
          setReminderTime(data.reminder_time)
          // Expand week 1 by default
          setExpandedWeeks({ 1: true })
        } else {
          setUploadError(t('planner.upload.error'))
        }
      } catch (err) {
        setUploadError(t('planner.upload.error'))
      }
    }
    reader.readAsText(file)
  }

  // Toggle Task Checklist
  const handleToggleTask = (weekNum: number, taskId: string) => {
    if (!plan) return

    const updatedWeeklyTasks = plan.weekly_tasks.map(week => {
      if (week.week_number === weekNum) {
        return {
          ...week,
          tasks: week.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        }
      }
      return week
    })

    const updatedPlan = {
      ...plan,
      weekly_tasks: updatedWeeklyTasks
    }
    setPlan(updatedPlan)
    if (updatedPlan.sync_task_quest) {
      let plans = []
      try {
        plans = JSON.parse(localStorage.getItem('activeStudyPlans') || '[]')
      } catch (e) {}
      const index = plans.findIndex((p: any) => p.plan_id === updatedPlan.plan_id)
      if (index >= 0) {
        plans[index] = updatedPlan
      } else {
        plans.push(updatedPlan)
      }
      localStorage.setItem('activeStudyPlans', JSON.stringify(plans))
      localStorage.setItem('activeStudyPlan', JSON.stringify(updatedPlan))
    }
  }

  // Calculate completion percentage
  const getCompletionStats = () => {
    if (!plan) return { total: 0, completed: 0, percent: 0 }
    
    let total = 0
    let completed = 0

    plan.weekly_tasks.forEach(w => {
      w.tasks.forEach(t => {
        total++
        if (t.completed) completed++
      })
    })

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, percent }
  }

  const handleDownloadPlan = () => {
    if (!plan) return

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(plan, null, 2)
    )}`
    
    const now = new Date()
    const day = now.getDate()
    
    let suffix = 'th'
    if (day < 11 || day > 13) {
      switch (day % 10) {
        case 1: suffix = 'st'; break
        case 2: suffix = 'nd'; break
        case 3: suffix = 'rd'; break
      }
    }
    
    const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
    const month = monthNames[now.getMonth()]
    const year = now.getFullYear()
    
    let hours = now.getHours()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    const filename = `study plan ${day}${suffix} ${month} ${year}, ${hours}:${minutes}${ampm}.json`
    
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', jsonString)
    downloadAnchor.setAttribute('download', filename)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Toggle Accordion Weeks
  const toggleWeekAccordion = (weekNum: number) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekNum]: !prev[weekNum]
    }))
  }

  const { total, completed, percent } = getCompletionStats()

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Halftone / Screentone Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#161616_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none z-0 opacity-40" />

      {/* Sticky navigation header */}
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
              { name: t('nav.grading'), href: '/features/grading-dojo', active: false },
              { name: t('nav.concept'), href: '/features/concept-dojo', active: false },
              { name: t('nav.planner'), href: '/features/study-planner', active: true }
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

        {/* Right side: Language switcher */}
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
        <div className="lg:hidden flex items-center ml-auto gap-3">
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
                    <X className="w-4 h-4 text-topper-graphite" />
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
      <main className="flex-1 w-full max-w-7xl px-6 md:px-12 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        
        {/* Left Column: Mascot speech & Upload Resume box */}
        <div className="lg:col-span-1 space-y-6">
          <OwlSpeech 
            message={
              plan 
                ? (language === 'hi' 
                  ? "शानदार! आपकी अभ्यास योजना तैयार है। दैनिक कार्यों को पूरा करें, चेकबॉक्स पर क्लिक करें और अपनी प्रगति को सिंक करने के लिए शीट फिर से डाउनलोड करें।" 
                  : "Superb! Your study plan is active. Tick off tasks as you complete them, and click Download to save your updated checklist file locally.")
                : t('planner.subtitle')
            } 
          />

          {/* Reset / New generation option if active plan is loaded */}
          {plan && (
            <ComicActionButton
              onClick={() => {
                const planIdToDelete = plan?.plan_id
                setPlan(null)
                setUploadError(null)
                if (planIdToDelete) {
                  let plans = []
                  try {
                    plans = JSON.parse(localStorage.getItem('activeStudyPlans') || '[]')
                  } catch (e) {}
                  const nextPlans = plans.filter((p: any) => p.plan_id !== planIdToDelete)
                  localStorage.setItem('activeStudyPlans', JSON.stringify(nextPlans))
                }
                localStorage.removeItem('activeStudyPlan')
              }}
              className="w-full justify-center bg-topper-charcoal border-2 border-topper-amber text-topper-amber font-extrabold uppercase shadow-[4px_4px_0_#000] hover:bg-topper-charcoal/80"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('planner.tracker.reset')}
            </ComicActionButton>
          )}

          {/* Upload panel to resume tracking (Only show if no plan active) */}
          {!plan && (
            <MangaPanel className="bg-topper-charcoal/80 border border-topper-graphite/60 p-5">
              <h3 className="text-sm font-black tracking-widest text-topper-amber uppercase border-b border-topper-graphite/60 pb-2 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {t('planner.upload.title')}
              </h3>
              <p className="text-xs text-topper-off-white/60 mb-4 leading-relaxed font-mono">
                {t('planner.upload.desc')}
              </p>

              <div className="relative border-2 border-dashed border-topper-graphite hover:border-topper-amber transition-colors p-6 text-center cursor-pointer bg-topper-black/30">
                <input
                  type="file"
                  accept=".json"
                  onChange={handlePlanUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileText className="w-8 h-8 text-topper-graphite mx-auto mb-2" />
                <span className="block text-xs font-semibold text-topper-off-white/60 select-none">
                  {language === 'hi' ? 'JSON फ़ाइल चुनें' : 'Choose plan JSON file'}
                </span>
              </div>

              {uploadError && (
                <div className="mt-3 p-3 bg-red-950/40 border border-red-500/50 text-red-200 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}
            </MangaPanel>
          )}

          {/* Extra styling notes */}
          <div className="p-4 bg-topper-charcoal/30 border border-topper-graphite/30 text-xs text-topper-off-white/50 space-y-2 font-mono">
            <p className="font-bold text-topper-amber uppercase tracking-wider">// SYSTEM SPECS</p>
            <p>Your progress is stored entirely in the JSON file you download. Upload it next time to resume with all completion ratios intact.</p>
          </div>
        </div>

        {/* Right Column: Planner Form or Tracker board */}
        <div className="lg:col-span-3 space-y-6">
          
          <AnimatePresence mode="wait">
            {!plan ? (
              
              // 1. Initial Generation Form Screen
              <motion.div
                key="planner-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-topper-graphite pb-3">
                  <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
                    <Calendar className="w-7 h-7 text-topper-amber" />
                    {t('planner.title')}
                  </h1>
                </div>

                {isLoading ? (
                  <div className="space-y-6">
                    {/* Step progression progress banner */}
                    <div className="bg-topper-charcoal border-2 border-topper-graphite rounded-xl p-5 flex items-center gap-4 shadow-[4px_4px_0_rgba(0,0,0,1)] relative select-none">
                      <div className="absolute inset-1.5 border border-dashed border-topper-graphite/40 pointer-events-none rounded-lg" />
                      <Loader2 className="w-6 h-6 text-topper-amber animate-spin relative z-10" />
                      <div className="space-y-0.5 relative z-10">
                        <p className="text-[11px] font-black text-topper-amber uppercase tracking-wider">
                          {t('planner.form.generating')}
                        </p>
                        <p className="text-xs font-semibold text-topper-off-white/80 transition-all">
                          {loadingSteps[genStep]}
                        </p>
                      </div>
                    </div>
                    
                    <StudyPlanSkeleton />
                  </div>
                ) : (
                  <MangaPanel className="bg-topper-charcoal/90 border-2 border-topper-off-white p-6 shadow-[5px_5px_0_#1a1a1a]">
                    <h2 className="text-lg font-black uppercase text-topper-amber mb-6 tracking-wider border-b border-topper-graphite/60 pb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      {t('planner.form.title')}
                    </h2>

                    {/* Input Form Fields */}
                    <form onSubmit={handleGeneratePlan} className="space-y-4">
                      
                      {/* Exam Name */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-topper-off-white/70 uppercase tracking-widest font-mono">
                          {t('planner.form.exam')}
                        </label>
                        <input
                          type="text"
                          required
                          value={examName}
                          onChange={(e) => setExamName(e.target.value)}
                          placeholder={t('planner.form.exam.placeholder')}
                          className="w-full bg-topper-black border border-topper-graphite text-topper-off-white px-3 py-2.5 text-sm focus:outline-none focus:border-topper-amber focus:ring-1 focus:ring-topper-amber rounded"
                        />
                      </div>

                      {/* Select limits grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Hours / day */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-topper-off-white/70 uppercase tracking-widest font-mono">
                            {t('planner.form.hours')}
                          </label>
                          <select
                            value={hoursPerDay}
                            onChange={(e) => setHoursPerDay(Number(e.target.value))}
                            className="w-full bg-topper-black border border-topper-graphite text-topper-off-white px-3 py-2.5 text-sm focus:outline-none focus:border-topper-amber rounded"
                          >
                            {[2, 3, 4, 5, 6, 8, 10, 12].map(h => (
                              <option key={h} value={h}>{h} {language === 'hi' ? 'घंटे/दिन' : 'hours/day'}</option>
                            ))}
                          </select>
                        </div>

                        {/* Duration Months */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-topper-off-white/70 uppercase tracking-widest font-mono">
                            {t('planner.form.duration')}
                          </label>
                          <select
                            value={durationMonths}
                            onChange={(e) => setDurationMonths(Number(e.target.value))}
                            className="w-full bg-topper-black border border-topper-graphite text-topper-off-white px-3 py-2.5 text-sm focus:outline-none focus:border-topper-amber rounded"
                          >
                            {[1, 2, 3, 4, 6, 8, 12].map(m => (
                              <option key={m} value={m}>{m} {m === 1 ? (language === 'hi' ? 'महीना' : 'month') : (language === 'hi' ? 'महीने' : 'months')}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Priority Subjects */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-topper-off-white/70 uppercase tracking-widest font-mono">
                          {t('planner.form.subjects')}
                        </label>
                        <input
                          type="text"
                          required
                          value={prioritySubjects}
                          onChange={(e) => setPrioritySubjects(e.target.value)}
                          placeholder={t('planner.form.subjects.placeholder')}
                          className="w-full bg-topper-black border border-topper-graphite text-topper-off-white px-3 py-2.5 text-sm focus:outline-none focus:border-topper-amber focus:ring-1 focus:ring-topper-amber rounded"
                        />
                      </div>

                      {/* Constraint Notes */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-topper-off-white/70 uppercase tracking-widest font-mono">
                          {t('planner.form.notes')}
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={t('planner.form.notes.placeholder')}
                          rows={3}
                          className="w-full bg-topper-black border border-topper-graphite text-topper-off-white p-3 text-sm focus:outline-none focus:border-topper-amber focus:ring-1 focus:ring-topper-amber placeholder:text-topper-off-white/30 rounded"
                        />
                      </div>

                      {/* Daily Reminder Time */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-topper-off-white/70 uppercase tracking-widest font-mono">
                          Daily Study Reminder Time
                        </label>
                        <input
                          type="time"
                          required
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="w-full bg-topper-black border border-topper-graphite text-topper-off-white px-3 py-2.5 text-sm focus:outline-none focus:border-topper-amber focus:ring-1 focus:ring-topper-amber rounded cursor-pointer font-mono"
                        />
                      </div>

                      {/* Sync to Task Quest Checkbox */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="syncTaskQuest"
                          checked={syncTaskQuest}
                          onChange={(e) => setSyncTaskQuest(e.target.checked)}
                          className="w-4 h-4 text-topper-amber bg-topper-black border-topper-graphite focus:ring-topper-amber cursor-pointer rounded"
                        />
                        <label htmlFor="syncTaskQuest" className="text-xs font-bold text-topper-off-white/80 uppercase tracking-wider font-mono cursor-pointer select-none">
                          Sync with Task Quest & enable daily reminders
                        </label>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={!examName.trim() || !prioritySubjects.trim()}
                          className="py-3 px-8 bg-topper-amber hover:bg-topper-amber/90 disabled:bg-topper-amber/40 text-topper-black font-extrabold uppercase text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[4px_4px_0_#000] border-2 border-topper-black rounded transition-all"
                        >
                          <Sparkles className="w-4 h-4" />
                          {t('planner.form.submit')}
                        </button>
                      </div>
                    </form>
                  </MangaPanel>
                )}
              </motion.div>
            ) : (
              
              // 2. Active Plan Tracker Board View
              <motion.div
                key="planner-tracker"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                
                {/* Header card with progress metrics */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-topper-graphite pb-4 gap-4">
                  <div>
                    <span className="text-xs bg-topper-amber/20 border border-topper-amber/40 text-topper-amber px-2.5 py-0.5 font-black uppercase tracking-wider font-mono">
                      // SYLLABUS QUEST ACTIVE
                    </span>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-topper-off-white mt-1">
                      {plan.plan_name}
                    </h1>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownloadPlan}
                      className="py-2.5 px-4 bg-topper-amber hover:bg-topper-amber/90 text-topper-black font-extrabold uppercase text-xs tracking-wider flex items-center gap-2 cursor-pointer border border-topper-black shadow-[3px_3px_0_#000] rounded transition-all"
                    >
                      <Download className="w-4 h-4" />
                      {t('planner.tracker.download')}
                    </button>
                  </div>
                </div>

                {/* Progress bar gauge */}
                <MangaPanel className="bg-topper-charcoal/90 border-2 border-topper-off-white p-5 flex flex-col md:flex-row items-center gap-6 shadow-[4px_4px_0_#1a1a1a]">
                  <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                    {/* Circle SVG */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" className="stroke-topper-black fill-none" strokeWidth="8" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        className="stroke-topper-amber fill-none transition-all duration-500" 
                        strokeWidth="8" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (251.2 * percent) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-lg font-black text-topper-amber font-mono">{percent}%</span>
                  </div>

                  <div className="text-center md:text-left space-y-1">
                    <h3 className="text-md font-black tracking-wide text-topper-amber uppercase">
                      {t('planner.tracker.progress')}
                    </h3>
                    <p className="text-sm font-semibold text-topper-off-white/70">
                      {completed} of {total} targets completed.
                    </p>
                    <p className="text-xs text-topper-off-white/40 font-mono">
                      Tick checkboxed items below to advance your completion dial.
                    </p>
                  </div>
                </MangaPanel>

                {/* Accordion Weeks List */}
                <div className="space-y-4">
                  {plan.weekly_tasks.map((week) => {
                    const isExpanded = !!expandedWeeks[week.week_number]
                    const completedTasksCount = week.tasks.filter(t => t.completed).length
                    const totalTasksCount = week.tasks.length

                    return (
                      <div 
                        key={week.week_number}
                        className="bg-topper-charcoal/50 border border-topper-graphite/60 shadow-[3px_3px_0_rgba(0,0,0,0.2)] overflow-hidden"
                      >
                        {/* Accordion trigger header */}
                        <div 
                          onClick={() => toggleWeekAccordion(week.week_number)}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-topper-charcoal/80 transition-colors select-none border-b border-topper-graphite/40"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-topper-black flex items-center justify-center font-black text-xs text-topper-amber border border-topper-amber/40 font-mono">
                              W{week.week_number}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-topper-off-white flex items-center gap-2">
                                {t('planner.tracker.week')} {week.week_number}: {week.theme}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono text-topper-off-white/50">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              completedTasksCount === totalTasksCount && totalTasksCount > 0
                                ? 'bg-green-950 text-green-400 border border-green-500/30'
                                : 'bg-topper-black border border-topper-graphite/60 text-topper-off-white/60'
                            }`}>
                              {completedTasksCount}/{totalTasksCount} {language === 'hi' ? 'पूर्ण' : 'done'}
                            </span>
                            <motion.span 
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-topper-amber"
                            >
                              ▼
                            </motion.span>
                          </div>
                        </div>

                        {/* Accordion details tasks list */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 space-y-3 bg-topper-black/10">
                                {week.tasks.map((task) => (
                                  <div 
                                    key={task.id}
                                    onClick={() => handleToggleTask(week.week_number, task.id)}
                                    className={`p-3 border transition-all flex items-start gap-4 cursor-pointer select-none ${
                                      task.completed
                                        ? 'bg-green-950/10 border-green-500/20 text-topper-off-white/50'
                                        : 'bg-topper-charcoal/20 border-topper-graphite/40 hover:border-topper-amber/60 hover:bg-topper-charcoal/40 text-topper-off-white'
                                    }`}
                                  >
                                    {/* Custom check indicators */}
                                    <div className={`w-5 h-5 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors ${
                                      task.completed
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : 'border-topper-graphite bg-topper-black'
                                    }`}>
                                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>

                                    {/* Task description */}
                                    <div className="flex-1 space-y-1">
                                      <h5 className={`text-sm font-bold tracking-tight transition-all ${task.completed ? 'line-through text-topper-off-white/40' : ''}`}>
                                        {task.title}
                                      </h5>
                                      <p className="text-xs text-topper-off-white/60 leading-relaxed font-medium">
                                        {task.description}
                                      </p>

                                      {/* Tags row */}
                                      <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] font-bold uppercase select-none">
                                        <span className={`px-1.5 py-0.5 rounded ${
                                          task.priority === 'high' 
                                            ? 'bg-red-950/50 text-red-400 border border-red-500/20'
                                            : task.priority === 'medium'
                                            ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20'
                                            : 'bg-blue-950/50 text-blue-400 border border-blue-500/20'
                                        }`}>
                                          Priority: {task.priority}
                                        </span>
                                        <span className="bg-topper-black/60 text-topper-off-white/50 px-1.5 py-0.5 border border-topper-graphite/40 rounded flex items-center gap-1">
                                          <BookOpen className="w-2.5 h-2.5 text-topper-amber" />
                                          {task.estimated_hours} {t('planner.tracker.hours')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-topper-off-white/30 border-t border-topper-graphite/40 font-mono mt-12 bg-topper-black/80 relative z-10">
        <div>
          © {new Date().getFullYear()} {language === 'hi' ? 'टॉपरभाई पाठ्यक्रम खोज डोजो' : 'TopperBhai Syllabus Quest Dojo'} // LEVEL OVER 9000
        </div>
      </footer>
    </div>
  )
}
