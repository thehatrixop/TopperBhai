'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/LanguageContext'
import {
  Plus,
  Filter,
  Calendar,
  Bell,
  BellOff,
  Trash2,
  Play,
  MessageSquare,
  X,
  Edit2,
  Clock,
  CheckCircle,
  ChevronDown,
  Menu,
  ChevronRight,
  Check
} from 'lucide-react'

// Task Interface
interface Task {
  id: string
  title: string
  description: string
  status: 'backlog' | 'inProgress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  reminderTime?: string // datetime-local format: "YYYY-MM-DDTHH:MM"
  notified?: boolean
}

type ColumnStatus = Task['status']

interface ColumnConfig {
  id: ColumnStatus
  title: string
  bulletColor: string
  borderColor: string
}

const COLUMNS: ColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', bulletColor: 'bg-red-500', borderColor: 'border-topper-graphite/60' },
  { id: 'inProgress', title: 'In Progress', bulletColor: 'bg-topper-amber', borderColor: 'border-topper-amber/60' },
  { id: 'review', title: 'Review', bulletColor: 'bg-topper-cyan', borderColor: 'border-topper-cyan/60' },
  { id: 'completed', title: 'Completed', bulletColor: 'bg-green-500', borderColor: 'border-topper-off-white/40' }
]

const MOCK_TASKS: Task[] = []

export default function TaskQuestPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ColumnStatus | null>(null)
  const [filterTag, setFilterTag] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Study Plan custom states
  const [studyPlans, setStudyPlans] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'kanban' | 'studyPlan'>('kanban')
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true })

  // Form States
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskStatus, setTaskStatus] = useState<ColumnStatus>('backlog')
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium')
  const [taskTagsInput, setTaskTagsInput] = useState('')
  const [taskReminder, setTaskReminder] = useState('')

  // Load state from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dojoTasks')
    if (stored) {
      try {
        setTasks(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse stored tasks", e)
        setTasks(MOCK_TASKS)
      }
    } else {
      setTasks(MOCK_TASKS)
      localStorage.setItem('dojoTasks', JSON.stringify(MOCK_TASKS))
    }

    const storedPlans = localStorage.getItem('activeStudyPlans')
    if (storedPlans) {
      try {
        const parsed = JSON.parse(storedPlans)
        setStudyPlans(parsed)
      } catch (e) {
        console.error("Failed to parse stored active study plans", e)
      }
    } else {
      const storedPlan = localStorage.getItem('activeStudyPlan')
      if (storedPlan) {
        try {
          const parsed = JSON.parse(storedPlan)
          parsed.plan_id = parsed.plan_id || `plan_${Date.now()}`
          setStudyPlans([parsed])
          localStorage.setItem('activeStudyPlans', JSON.stringify([parsed]))
        } catch (e) {}
      }
    }

    // Check notification permission state and local preference
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const hasPermission = Notification.permission === 'granted'
      const localPref = localStorage.getItem('taskQuest_remindersEnabled') !== 'false'
      setNotificationsEnabled(hasPermission && localPref)
    }
  }, [])

  // Sync state to local storage when tasks change
  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    localStorage.setItem('dojoTasks', JSON.stringify(newTasks))
  }

  // Toggle browser notification reminders
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert(language === 'hi' ? "इस ब्राउज़र में ब्राउज़र सूचनाएं समर्थित नहीं हैं।" : "Browser notifications are not supported in this browser.")
      return
    }

    if (notificationsEnabled) {
      // Disable reminders
      setNotificationsEnabled(false)
      localStorage.setItem('taskQuest_remindersEnabled', 'false')
    } else {
      // Enable reminders
      if (Notification.permission === 'denied') {
        alert(language === 'hi'
          ? "सूचनाएं ब्लॉक कर दी गई हैं। कृपया सूचनाएं प्राप्त करने के लिए अपने ब्राउज़र की सेटिंग में जाकर इस साइट के लिए अनुमति प्रदान करें।"
          : "Notifications are blocked. Please enable notification permissions for this website in your browser settings to receive study reminders."
        )
        return
      }
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        localStorage.setItem('taskQuest_remindersEnabled', 'true')
      } else {
        setNotificationsEnabled(false)
      }
    }
  }

  // Browser Notification Background Checker (Interval runs every 30 seconds)
  useEffect(() => {
    const checkReminders = () => {
      if (!notificationsEnabled) return

      const now = new Date()
      const nowString = now.toISOString().slice(0, 16) // format: YYYY-MM-DDTHH:MM local format matching input

      // Get local time string
      const localYear = now.getFullYear()
      const localMonth = String(now.getMonth() + 1).padStart(2, '0')
      const localDate = String(now.getDate()).padStart(2, '0')
      const localHours = String(now.getHours()).padStart(2, '0')
      const localMins = String(now.getMinutes()).padStart(2, '0')
      const currentLocalString = `${localYear}-${localMonth}-${localDate}T${localHours}:${localMins}`

      let updated = false
      const nextTasks = tasks.map(task => {
        if (task.reminderTime && task.reminderTime <= currentLocalString && !task.notified && task.status !== 'completed') {
          // Trigger browser notification
          try {
            new Notification(language === 'hi' ? "अध्ययन का समय! ⏱️" : "Study Time! ⏱️", {
              body: language === 'hi' 
                ? `कार्य अनुस्मारक: "${task.title}" अभी शुरू होने वाला है। आइए इस पर विजय प्राप्त करें!`
                : `Task Reminder: "${task.title}" is scheduled to start now. Let's conquer it!`,
            })
            // Play a synthetic sound chime
            playChime()
          } catch (err) {
            console.error("Notification failed", err)
          }
          updated = true
          return { ...task, notified: true }
        }
        return task
      })

      if (updated) {
        saveTasks(nextTasks)
      }

      // Check AI study plans reminders
      const activePlansStr = localStorage.getItem('activeStudyPlans')
      if (activePlansStr && notificationsEnabled) {
        try {
          const activePlans = JSON.parse(activePlansStr)
          for (const activePlan of activePlans) {
            if (activePlan.reminder_time) {
              const currentLocalTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
              if (currentLocalTime === activePlan.reminder_time) {
                const currentDateStr = now.toDateString()
                const lastNotifiedKey = `studyPlan_${activePlan.plan_id}_lastNotifiedDate`
                const lastNotified = localStorage.getItem(lastNotifiedKey)
                
                if (lastNotified !== currentDateStr) {
                  // Find first incomplete task in plan
                  let nextTaskToStudy = null
                  for (const week of activePlan.weekly_tasks) {
                    const incomplete = week.tasks.find((t: any) => !t.completed)
                    if (incomplete) {
                      nextTaskToStudy = incomplete
                      break
                    }
                  }

                  if (nextTaskToStudy) {
                    new Notification(language === 'hi' ? `स्मरण: ${activePlan.plan_name} 📚` : `Reminder: ${activePlan.plan_name} 📚`, {
                      body: language === 'hi'
                        ? `आज आपको पढ़ना है: "${nextTaskToStudy.title}" (${nextTaskToStudy.description})`
                        : `Today's target: "${nextTaskToStudy.title}" (${nextTaskToStudy.description})`
                    })
                    playChime()
                    localStorage.setItem(lastNotifiedKey, currentDateStr)
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("AI Study Plans notification check failed:", err)
        }
      }
    }

    const interval = setInterval(checkReminders, 15000) // check every 15s
    return () => clearInterval(interval)
  }, [tasks, notificationsEnabled, language])

  // Simple sound synthesizer chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15) // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {
      console.error(e)
    }
  }

  // HTML5 Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: ColumnStatus) => {
    e.preventDefault()
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId)
    }
  }

  const handleDrop = (e: React.DragEvent, targetStatus: ColumnStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId
    if (taskId) {
      const nextTasks = tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, status: targetStatus, notified: targetStatus === 'completed' ? true : task.notified }
        }
        return task
      })
      saveTasks(nextTasks)
    }
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  // Modal actions
  const openAddTask = () => {
    setEditingTask(null)
    setTaskTitle('')
    setTaskDesc('')
    setTaskStatus('backlog')
    setTaskPriority('medium')
    setTaskTagsInput('')
    setTaskReminder('')
    setShowAddModal(true)
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDesc(task.description)
    setTaskStatus(task.status)
    setTaskPriority(task.priority)
    setTaskTagsInput(task.tags.join(', '))
    setTaskReminder(task.reminderTime || '')
    setShowAddModal(true)
  }

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    const parsedTags = taskTagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    if (editingTask) {
      // Edit mode
      const nextTasks = tasks.map(task => {
        if (task.id === editingTask.id) {
          return {
            ...task,
            title: taskTitle.trim(),
            description: taskDesc.trim(),
            status: taskStatus,
            priority: taskPriority,
            tags: parsedTags,
            reminderTime: taskReminder || undefined,
            notified: taskReminder !== task.reminderTime ? false : task.notified
          }
        }
        return task
      })
      saveTasks(nextTasks)
    } else {
      // Add mode
      const newTask: Task = {
        id: Math.random().toString(36).substring(2, 9),
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        status: taskStatus,
        priority: taskPriority,
        tags: parsedTags,
        reminderTime: taskReminder || undefined,
        notified: false
      }
      saveTasks([...tasks, newTask])
    }

    setShowAddModal(false)
  }

  const handleDeleteTask = (taskId: string) => {
    const nextTasks = tasks.filter(task => task.id !== taskId)
    saveTasks(nextTasks)
    if (editingTask && editingTask.id === taskId) {
      setShowAddModal(false)
    }
  }

  // Focus Dojo Integration: Pre-fill custom time limit and title redirect
  const handleStartStudyBlock = (task: Task) => {
    // We pre-set study settings in localStorage for Focus Dojo page to load
    localStorage.setItem('focusDojo_initialTitle', task.title)
    // Redirect directly to Focus Dojo
    router.push('/features/focus-dojo')
  }

  // Toggle study plan tasks checklist from Task Quest
  const handleTogglePlanTask = (planId: string, weekNum: number, taskId: string) => {
    const nextPlans = studyPlans.map((plan: any) => {
      if (plan.plan_id === planId) {
        const updatedWeeklyTasks = plan.weekly_tasks.map((week: any) => {
          if (week.week_number === weekNum) {
            return {
              ...week,
              tasks: week.tasks.map((t: any) => t.id === taskId ? { ...t, completed: !t.completed } : t)
            }
          }
          return week
        })
        return { ...plan, weekly_tasks: updatedWeeklyTasks }
      }
      return plan
    })
    setStudyPlans(nextPlans)
    localStorage.setItem('activeStudyPlans', JSON.stringify(nextPlans))
    
    // Fallback sync
    const current = nextPlans.find((p: any) => p.plan_id === planId)
    if (current) {
      localStorage.setItem('activeStudyPlan', JSON.stringify(current))
    }
  }

  // Delete active study plan quest
  const handleDeleteStudyPlan = (planId: string) => {
    if (confirm(language === 'hi' ? "क्या आप वाकई इस अध्ययन योजना को हटाना चाहते हैं?" : "Are you sure you want to delete this study plan?")) {
      const nextPlans = studyPlans.filter((p: any) => p.plan_id !== planId)
      setStudyPlans(nextPlans)
      localStorage.setItem('activeStudyPlans', JSON.stringify(nextPlans))
      localStorage.removeItem('activeStudyPlan')
      setSelectedPlanId(null)
    }
  }

  // Toggle week accordion
  const toggleWeekAccordion = (weekNum: number) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekNum]: !prev[weekNum]
    }))
  }

  // Progress percentage gauge value calculator
  const getPlanCompletionPercent = (plan: any) => {
    if (!plan) return 0
    let total = 0
    let completed = 0
    plan.weekly_tasks.forEach((w: any) => {
      w.tasks.forEach((t: any) => {
        total++
        if (t.completed) completed++
      })
    })
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  // Filtration logic
  const allUniqueTags = Array.from(
    new Set(tasks.flatMap(task => task.tags))
  ).sort()

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = !filterTag || task.tags.includes(filterTag)
    return matchesSearch && matchesTag
  })

  // Group tasks by column
  const getTasksByStatus = (status: ColumnStatus) => {
    return filteredTasks.filter(task => task.status === status)
  }

  // Priority color formatting helper
  const getPriorityBadgeClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-500/10 border-red-500/30'
      case 'medium':
        return 'text-topper-amber bg-topper-amber/10 border-topper-amber/30'
      case 'low':
        return 'text-topper-cyan bg-topper-cyan/10 border-topper-cyan/30'
    }
  }

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Halftone matrix texture backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#161616_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none z-0 opacity-40" />

      {/* Static navigation header */}
      {/* Static navigation header */}
      <nav className="w-full relative z-50 border-b-2 border-topper-graphite px-6 py-4 md:px-12 flex items-center justify-between bg-topper-black/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-2xl font-black tracking-tighter hover:text-topper-amber transition-colors flex items-center gap-2 uppercase">
            <Image src="/topper-owl.png" alt="Logo" width={28} height={28} className="object-contain" />
            {language === 'hi' ? 'टॉपरभाई' : 'TopperBhai'}
          </Link>
          
          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { name: t('nav.focus'), href: '/features/focus-dojo', active: false },
              { name: t('nav.tasks'), href: '/features/task-quest', active: true },
              { name: t('nav.scribe'), href: '/features/scribe-dojo', active: false },
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

        {/* Right side: Language, Bell and CTA */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Browser Notifications Activation Bell */}
          <button
            onClick={requestNotificationPermission}
            className={`px-4 py-2 border-2 text-xs font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-2 shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0 ${notificationsEnabled
                ? 'border-topper-amber bg-topper-amber/10 text-topper-amber'
                : 'border-topper-graphite bg-topper-charcoal/40 text-topper-off-white hover:border-topper-amber'
              }`}
            title={notificationsEnabled ? (language === 'hi' ? "ब्राउज़र सूचनाएं अधिकृत हैं" : "Browser notifications are authorized") : (language === 'hi' ? "अध्ययन अनुस्मारक सूचनाएं अधिकृत करें" : "Authorize study reminder notifications")}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="w-4 h-4 animate-bounce" />
                <span>{language === 'hi' ? 'स्मरण सक्रिय' : 'Reminders Active'}</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                <span>{language === 'hi' ? 'अनुस्मारक सक्रिय करें' : 'Activate Reminders'}</span>
              </>
            )}
          </button>
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
            onClick={requestNotificationPermission}
            className={`px-3 py-1.5 border-2 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0_rgba(0,0,0,1)] ${notificationsEnabled
                ? 'border-topper-amber bg-topper-amber/10 text-topper-amber'
                : 'border-topper-graphite bg-topper-charcoal/40 text-topper-off-white'
              }`}
          >
            {notificationsEnabled ? <Bell className="w-3.5 h-3.5 animate-bounce" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>
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

      {/* Main Kanban Workspace */}
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-6 md:px-12 py-10 relative z-10">
        {studyPlans.length > 0 && (
          <div className="flex gap-4 mb-6 border-b-2 border-topper-graphite/40 pb-2">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`pb-2 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${
                activeTab === 'kanban' 
                  ? 'border-topper-amber text-topper-amber' 
                  : 'border-transparent text-topper-off-white/55 hover:text-topper-off-white'
              }`}
            >
              🛡️ {language === 'hi' ? 'मेरे व्यक्तिगत कार्य' : 'My Personal Tasks'}
            </button>
            <button
              onClick={() => setActiveTab('studyPlan')}
              className={`pb-2 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${
                activeTab === 'studyPlan' 
                  ? 'border-topper-amber text-topper-amber' 
                  : 'border-transparent text-topper-off-white/55 hover:text-topper-off-white'
              }`}
            >
              📜 {language === 'hi' ? 'AI अध्ययन योजनाएं' : 'AI Study Plans'}
            </button>
          </div>
        )}

        {activeTab === 'kanban' ? (
          <>
            {/* Workspace Top Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">{language === 'hi' ? 'सक्रिय कार्य' : 'Active Tasks'}</h1>
            <p className="text-sm text-topper-graphite font-bold uppercase tracking-wider mt-1">
              {language === 'hi' ? 'अध्ययन कार्यक्रम और बैकलॉग उद्देश्यों का समन्वय करें' : 'Coordinate study schedules and backlog objectives'}
            </p>
          </div>

          {/* Action Row: Filters, Search, Add Button */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'hi' ? 'उद्देश्य खोजें...' : 'Search objectives...'}
                className="px-4 py-2 text-sm bg-topper-charcoal border-2 border-topper-graphite rounded-md text-topper-off-white placeholder-topper-graphite focus:outline-none focus:border-topper-amber font-bold w-48 md:w-56"
              />
            </div>

            {/* Tag Selection Filter */}
            <div className="relative">
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-4 py-2 text-sm bg-topper-charcoal border-2 border-topper-graphite rounded-md text-topper-off-white focus:outline-none focus:border-topper-amber font-bold cursor-pointer pr-8 appearance-none"
              >
                <option value="" className="bg-topper-charcoal text-topper-off-white">{t('tasks.allTags')}</option>
                {allUniqueTags.map(tag => (
                  <option key={tag} value={tag} className="bg-topper-charcoal text-topper-off-white">{tag}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-topper-graphite">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Mock Date Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-topper-charcoal border-2 border-topper-graphite rounded text-xs font-black uppercase tracking-wider text-topper-off-white/80 select-none">
              <Calendar className="w-4 h-4 text-topper-amber" />
              <span>{language === 'hi' ? 'आज' : 'Today'}</span>
            </div>

            {/* Add Task Button */}
            <button
              onClick={openAddTask}
              className="px-6 py-2.5 bg-topper-amber hover:bg-topper-amber/90 text-topper-black font-black border-2 border-topper-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all cursor-pointer text-xs uppercase tracking-widest"
            >
              + {language === 'hi' ? 'कार्य जोड़ें' : 'Add Task'}
            </button>
          </div>
        </div>

        {/* Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start w-full">
          {COLUMNS.map(col => {
            const colTasks = getTasksByStatus(col.id)
            const isDragOver = dragOverColumn === col.id

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-topper-charcoal/80 border-2 rounded-2xl p-5 flex flex-col gap-4 shadow-[4px_4px_0_rgba(0,0,0,1)] transition-all duration-300 ${isDragOver ? 'border-topper-amber border-dashed bg-topper-charcoal' : 'border-topper-graphite'
                  }`}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-2 border-b border-topper-graphite/40">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${col.bulletColor}`} />
                    <span className="font-black uppercase tracking-wider text-sm select-none">
                      {t(`tasks.${col.id}` as any)}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-topper-graphite bg-topper-black px-2 py-0.5 rounded border border-topper-graphite/30 select-none">
                    {colTasks.length.toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Task Stack Container */}
                <div
                  className="flex flex-col gap-4 min-h-[300px] transition-all"
                  onDragLeave={handleDragEnd}
                >
                  {colTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-topper-graphite/20 rounded-xl select-none">
                      <CheckCircle className="w-8 h-8 text-topper-graphite/30 mb-2" />
                      <span className="text-xs font-black text-topper-graphite uppercase tracking-wider">{language === 'hi' ? 'कोई उद्देश्य नहीं' : 'No Objectives'}</span>
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className="group bg-topper-black border-2 border-topper-graphite rounded-xl p-5 hover:border-topper-amber shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[5px_5px_0_rgba(0,0,0,1)] transition-all relative flex flex-col gap-3.5 cursor-grab active:cursor-grabbing"
                      >
                        {/* Card Top Title Row */}
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-black text-base uppercase tracking-tight text-topper-off-white group-hover:text-topper-amber transition-colors leading-tight">
                            {task.title}
                          </h3>
                          <button
                            onClick={() => openEditTask(task)}
                            className="p-1 border border-topper-graphite/40 text-topper-graphite hover:text-topper-amber hover:border-topper-amber transition-colors bg-topper-charcoal/30 cursor-pointer rounded"
                            title="Edit task"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-topper-graphite leading-relaxed">
                          {task.description}
                        </p>

                        {/* Scheduled Reminder Indicator */}
                        {task.reminderTime && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-topper-cyan bg-topper-cyan/5 border border-topper-cyan/20 px-2 py-1 rounded w-fit select-none">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(task.reminderTime).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        )}

                        {/* Tags & Priority row */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {task.tags.map(tag => (
                            <span
                              key={tag}
                              className="border border-topper-graphite/40 text-topper-graphite text-[9px] uppercase font-black px-2 py-0.5 rounded select-none"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Card Bottom Meta & Actions */}
                        <div className="flex justify-between items-center border-t border-topper-graphite/20 pt-3 mt-1 text-xs">
                          {/* Priority dot badge */}
                          <span className={`text-[9px] uppercase font-black px-2 py-0.5 border rounded-full select-none ${getPriorityBadgeClass(task.priority)}`}>
                            {task.priority}
                          </span>

                          <div className="flex items-center gap-3">
                            {/* Focus Dojo Sync trigger for In-Progress cards */}
                            {col.id === 'inProgress' && (
                              <button
                                onClick={() => handleStartStudyBlock(task)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-topper-amber text-topper-black border border-topper-black rounded font-black text-[10px] uppercase shadow-[1.5px_1.5px_0_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0 transition-all cursor-pointer"
                                title={language === 'hi' ? 'कार्य का नाम सीधे अध्ययन फोकस डोजो में लोड करें' : 'Load task name directly into Study Focus Dojo'}
                              >
                                <Play className="w-2.5 h-2.5 fill-topper-black" />
                                <span>{language === 'hi' ? 'अध्ययन' : 'Study'}</span>
                              </button>
                            )}

                            {/* Dummy comments placeholder */}
                            <span className="flex items-center gap-1 text-[10px] text-topper-graphite select-none">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>2</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
          </>
        ) : (
          studyPlans.length > 0 && (
            <div className="space-y-6">
              {selectedPlanId === null ? (
                // 1. List View of Active Study Plans
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-topper-graphite/40 pb-3">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-topper-off-white">
                        {language === 'hi' ? 'सक्रिय अध्ययन योजनाएं' : 'Active Study Plans'}
                      </h2>
                      <p className="text-xs text-topper-off-white/50 font-mono mt-1">
                        Active Plans: {studyPlans.length}/3 synced. Select one to track goals.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studyPlans.map((plan: any) => {
                      const pct = getPlanCompletionPercent(plan)
                      return (
                        <div 
                          key={plan.plan_id}
                          className="bg-topper-charcoal/90 border-2 border-topper-graphite hover:border-topper-amber transition-colors p-5 rounded-2xl flex flex-col justify-between shadow-[4px_4px_0_rgba(0,0,0,1)] relative overflow-hidden group"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-3">
                              <span className="text-[10px] bg-topper-amber/20 border border-topper-amber/40 text-topper-amber px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
                                {language === 'hi' ? 'अध्ययन खोज' : 'STUDY QUEST'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStudyPlan(plan.plan_id);
                                }}
                                className="p-1 bg-red-950/30 border border-red-500/30 hover:bg-red-500 hover:text-white rounded text-red-400 transition-all text-xs font-mono"
                                title="Delete study plan"
                              >
                                🗑️
                              </button>
                            </div>
                            
                            <h3 className="text-lg font-black text-topper-off-white leading-tight mb-2 group-hover:text-topper-amber transition-colors">
                              {plan.plan_name}
                            </h3>

                            {plan.reminder_time && (
                              <p className="text-xs text-topper-off-white/60 font-mono flex items-center gap-1.5 mb-4">
                                <Clock className="w-3.5 h-3.5 text-topper-amber" />
                                Daily at {plan.reminder_time}
                              </p>
                            )}
                          </div>

                          <div className="space-y-4 pt-2 border-t border-topper-graphite/20">
                            {/* Completion Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-mono font-bold">
                                <span className="text-topper-off-white/50">Progress</span>
                                <span className="text-topper-amber">{pct}%</span>
                              </div>
                              <div className="w-full bg-topper-black h-2 rounded overflow-hidden border border-topper-graphite/40">
                                <div className="bg-topper-amber h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>
                            </div>

                            <button
                              onClick={() => setSelectedPlanId(plan.plan_id)}
                              className="w-full py-2 bg-topper-amber hover:bg-topper-amber/90 text-topper-black font-black uppercase text-xs tracking-wider rounded border border-topper-black shadow-[2px_2px_0_rgba(0,0,0,1)] transition-all cursor-pointer text-center"
                            >
                              {language === 'hi' ? 'योजना खोलें' : 'Open Quest'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                // 2. Open Tracker View for Selected Study Plan
                (() => {
                  const currentPlan = studyPlans.find((p: any) => p.plan_id === selectedPlanId)
                  if (!currentPlan) return null

                  const planPct = getPlanCompletionPercent(currentPlan)

                  return (
                    <div className="space-y-6">
                      {/* Header card with progress metrics & back/delete buttons */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-topper-graphite/40 pb-4 gap-4">
                        <div className="space-y-1">
                          <button
                            onClick={() => setSelectedPlanId(null)}
                            className="text-xs text-topper-amber hover:underline uppercase tracking-widest font-black flex items-center gap-1 cursor-pointer"
                          >
                            ← {language === 'hi' ? 'सभी योजनाओं की सूची' : 'Back to Study Plans List'}
                          </button>
                          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-topper-off-white mt-2">
                            {currentPlan.plan_name}
                          </h2>
                          {currentPlan.reminder_time && (
                            <p className="text-xs text-topper-off-white/60 font-mono mt-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-topper-amber" />
                              Daily reminder scheduled at {currentPlan.reminder_time}
                            </p>
                          )}
                        </div>

                        {/* Action Button: Delete Study Plan */}
                        <button
                          onClick={() => handleDeleteStudyPlan(currentPlan.plan_id)}
                          className="py-2.5 px-4 bg-red-950/45 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/40 text-xs font-black uppercase tracking-wider rounded transition-all cursor-pointer shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0"
                        >
                          🗑️ {language === 'hi' ? 'अध्ययन योजना हटाएं' : 'Delete Study Plan'}
                        </button>
                      </div>

                      {/* Circular Progress Gauge */}
                      <div className="bg-topper-charcoal/90 border-2 border-topper-graphite/60 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-[4px_4px_0_rgba(0,0,0,1)]">
                        <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" className="stroke-topper-black fill-none" strokeWidth="8" />
                            <circle 
                              cx="50" 
                              cy="50" 
                              r="40" 
                              className="stroke-topper-amber fill-none transition-all duration-500" 
                              strokeWidth="8" 
                              strokeDasharray="251.2" 
                              strokeDashoffset={251.2 - (251.2 * planPct) / 100}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-lg font-black text-topper-amber font-mono">{planPct}%</span>
                        </div>

                        <div className="text-center md:text-left space-y-1">
                          <h3 className="text-md font-black tracking-wide text-topper-amber uppercase">
                            {language === 'hi' ? 'पाठ्यक्रम पूर्णता अनुपात' : 'Syllabus Completion Ratio'}
                          </h3>
                          <p className="text-sm font-semibold text-topper-off-white/70">
                            This study tracker is non-editable. Check off tasks below as you complete them to update your progress.
                          </p>
                        </div>
                      </div>

                      {/* Week list */}
                      <div className="space-y-4">
                        {currentPlan.weekly_tasks.map((week: any) => {
                          const isExpanded = !!expandedWeeks[week.week_number]
                          const completedTasksCount = week.tasks.filter((t: any) => t.completed).length
                          const totalTasksCount = week.tasks.length

                          return (
                            <div 
                              key={week.week_number}
                              className="bg-topper-charcoal/50 border border-topper-graphite/60 rounded-xl overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.15)]"
                            >
                              <div 
                                onClick={() => toggleWeekAccordion(week.week_number)}
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-topper-charcoal/80 transition-colors select-none border-b border-topper-graphite/40"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-topper-black flex items-center justify-center font-black text-xs text-topper-amber border border-topper-amber/40 font-mono">
                                    W{week.week_number}
                                  </span>
                                  <h4 className="text-sm font-bold text-topper-off-white">
                                    {language === 'hi' ? `सप्ताह ${week.week_number}` : `Week ${week.week_number}`}: {week.theme}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-3 text-xs font-mono text-topper-off-white/50">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    completedTasksCount === totalTasksCount && totalTasksCount > 0
                                      ? 'bg-green-950 text-green-400 border border-green-500/30'
                                      : 'bg-topper-black border border-topper-graphite/60 text-topper-off-white/60'
                                  }`}>
                                    {completedTasksCount}/{totalTasksCount} {language === 'hi' ? 'पूर्ण' : 'done'}
                                  </span>
                                  <span>{isExpanded ? '▲' : '▼'}</span>
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-topper-black/10"
                                  >
                                    <div className="p-4 space-y-3">
                                      {week.tasks.map((task: any) => (
                                        <div 
                                          key={task.id}
                                          onClick={() => handleTogglePlanTask(currentPlan.plan_id, week.week_number, task.id)}
                                          className={`p-3 border rounded transition-all flex items-start gap-4 cursor-pointer select-none ${
                                            task.completed
                                              ? 'bg-green-950/10 border-green-500/20 text-topper-off-white/50'
                                              : 'bg-topper-charcoal/20 border-topper-graphite/40 hover:border-topper-amber/60 hover:bg-topper-charcoal/40 text-topper-off-white'
                                          }`}
                                        >
                                          <div className={`w-5 h-5 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors ${
                                            task.completed
                                              ? 'bg-green-600 border-green-600 text-white'
                                              : 'border-topper-graphite bg-topper-black'
                                          }`}>
                                            {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                          </div>

                                          <div className="flex-1 space-y-1">
                                            <h5 className={`text-sm font-bold tracking-tight transition-all ${task.completed ? 'line-through text-topper-off-white/40' : ''}`}>
                                              {task.title}
                                            </h5>
                                            <p className="text-xs text-topper-off-white/60 leading-relaxed font-medium">
                                              {task.description}
                                            </p>

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
                                                {task.estimated_hours} hours est.
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
                    </div>
                  )
                })()
              )}
            </div>
          )
        )}
      </main>

      {/* Empty Footer Spacer */}
      <footer className="py-6 border-t-2 border-topper-graphite/20 mt-16 text-center select-none z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-topper-graphite">
          {language === 'hi' ? 'टॉपरभाई टास्कमास्टर सिस्टम • ऑफ़लाइन सुरक्षित' : 'TopperBhai Taskmaster System • Persisted Offline'}
        </span>
      </footer>

      {/* Form Dialog Modal popup (Add / Edit Task) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            {/* Backdrop Overlay */}
            <motion.div
              key="task-quest-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-topper-black/80 backdrop-blur-sm cursor-pointer z-0"
            />

            {/* Modal Panel Container */}
            <motion.div
              key="task-quest-modal-panel"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              style={{ backgroundColor: '#1a1a1a' }}
              className="border-4 border-black p-8 rounded-2xl w-full max-w-md shadow-[10px_10px_0_rgba(0,0,0,1)] relative z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 p-1 border border-[#2a2a2a] text-[#a0a0a0] hover:text-topper-amber hover:border-topper-amber rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 border-b-2 border-[#2a2a2a] pb-3">
                {editingTask 
                  ? (language === 'hi' ? 'उद्देश्य संशोधित करें' : 'Modify Objective') 
                  : (language === 'hi' ? 'नया उद्देश्य' : 'New Objective')}
              </h2>

              <form onSubmit={handleSaveTask} className="space-y-4 font-bold">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-topper-off-white/60">{language === 'hi' ? 'उद्देश्य शीर्षक' : 'Objective Title'}</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder={language === 'hi' ? 'उदा. ऑपरेटिंग सिस्टम सेमाफोर अभ्यास' : 'e.g. OS Semaphores practice'}
                    className="px-4 py-2.5 text-sm bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-md text-topper-off-white placeholder-[#555555] focus:outline-none focus:border-topper-amber"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-topper-off-white/60">{language === 'hi' ? 'विवरण' : 'Description'}</label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder={language === 'hi' ? 'कार्य सीमाओं का संक्षिप्त विवरण...' : 'Short description of task limits...'}
                    rows={3}
                    className="px-4 py-2.5 text-sm bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-md text-topper-off-white placeholder-[#555555] focus:outline-none focus:border-topper-amber resize-none font-sans"
                  />
                </div>

                {/* Status & Priority Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-topper-off-white/60">{language === 'hi' ? 'स्थिति' : 'Status'}</label>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value as ColumnStatus)}
                      className="px-4 py-2.5 text-sm bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-md text-topper-off-white focus:outline-none focus:border-topper-amber cursor-pointer"
                    >
                      <option value="backlog" className="bg-[#1a1a1a] text-topper-off-white">{t('tasks.backlog')}</option>
                      <option value="inProgress" className="bg-[#1a1a1a] text-topper-off-white">{t('tasks.inProgress')}</option>
                      <option value="review" className="bg-[#1a1a1a] text-topper-off-white">{t('tasks.review')}</option>
                      <option value="completed" className="bg-[#1a1a1a] text-topper-off-white">{t('tasks.completed')}</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-topper-off-white/60">{language === 'hi' ? 'प्राथमिकता' : 'Priority'}</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as Task['priority'])}
                      className="px-4 py-2.5 text-sm bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-md text-topper-off-white focus:outline-none focus:border-topper-amber cursor-pointer"
                    >
                      <option value="low" className="bg-[#1a1a1a] text-topper-off-white">{language === 'hi' ? 'कम' : 'Low'}</option>
                      <option value="medium" className="bg-[#1a1a1a] text-topper-off-white">{language === 'hi' ? 'मध्यम' : 'Medium'}</option>
                      <option value="high" className="bg-[#1a1a1a] text-topper-off-white">{language === 'hi' ? 'उच्च' : 'High'}</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-topper-off-white/60">{language === 'hi' ? 'टैग (अल्पविराम से अलग करें)' : 'Tags (comma-separated)'}</label>
                  <input
                    type="text"
                    value={taskTagsInput}
                    onChange={(e) => setTaskTagsInput(e.target.value)}
                    placeholder={language === 'hi' ? 'उदा. ओएस, रिवीजन, डीएसए' : 'e.g. OS, Revision, DSA'}
                    className="px-4 py-2.5 text-sm bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-md text-topper-off-white placeholder-[#555555] focus:outline-none focus:border-topper-amber"
                  />
                </div>

                {/* Scheduler Reminder Date/Time */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-topper-off-white/60 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-topper-cyan" />
                    <span>{language === 'hi' ? 'अनुस्मारक समय निर्धारित करें (वैकल्पिक)' : 'Schedule Reminder Time (Optional)'}</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={taskReminder}
                    onChange={(e) => setTaskReminder(e.target.value)}
                    className="px-4 py-2.5 text-sm bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-md text-topper-off-white focus:outline-none focus:border-topper-amber font-mono cursor-pointer"
                  />
                </div>

                {/* Actions row */}
                <div className="flex justify-between items-center pt-4">
                  {editingTask ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(editingTask.id)}
                      className="px-4 py-2 bg-transparent border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{language === 'hi' ? 'हटाएं' : 'Delete'}</span>
                    </button>
                  ) : <div />}

                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-topper-amber text-topper-black font-black border-2 border-topper-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all cursor-pointer text-xs uppercase tracking-widest ml-auto"
                  >
                    {editingTask 
                      ? (language === 'hi' ? 'सहेजें' : 'Save Task') 
                      : (language === 'hi' ? 'बनाएं' : 'Create Task')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
