'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { OwlSpeech, SpeedLine } from '@/components/manga-ui'
import { 
  Volume2, 
  VolumeX, 
  Settings,
  Sparkles as SparkleIcon,
  ChevronDown,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

interface PresetConfig {
  label: string
  minutes: number
  color: string
}

const PRESETS: Record<TimerMode, PresetConfig> = {
  work: { label: 'Study Block', minutes: 25, color: '#f5a623' },
  shortBreak: { label: '5 Min Break', minutes: 5, color: '#00d9ff' },
  longBreak: { label: '15 Min Break', minutes: 15, color: '#2ecc71' }
}

const OWL_QUOTES = {
  work: [
    "Focus Dojo is active. Dedicate this block of time to study. No scrolls, no distractions!",
    "Concentrate on your subject. True toppers build their knowledge brick by brick.",
    "The clock is ticking, but your mind is still. Find your study flow!",
    "Harness your focus chakra. This training session will pay off on exam day!"
  ],
  shortBreak: [
    "Victory! Relax for a few minutes. Stretch, drink some water, and rest your eyes.",
    "Break active. Rest your mind. Your brain is processing the knowledge right now.",
    "Time to recharge. Do a quick stretch before the next training block!"
  ],
  longBreak: [
    "A well-deserved extended break! Take a walk or grab a snack before the next session.",
    "Maximum recovery mode. Step away from the screen and refresh your spirit!"
  ]
}

const OWL_QUOTES_HI = {
  work: [
    "फोकस डोजो सक्रिय है। इस समय को अध्ययन के लिए समर्पित करें। कोई विकर्षण नहीं!",
    "अपने विषय पर ध्यान केंद्रित करें। सच्चे टॉपर ईंट-दर-ईंट अपना ज्ञान बनाते हैं।",
    "घड़ी चल रही है, लेकिन आपका दिमाग शांत है। अपने अध्ययन का प्रवाह खोजें!",
    "अपने फोकस चक्र को काम में लाएं। यह प्रशिक्षण सत्र परीक्षा के दिन काम आएगा!"
  ],
  shortBreak: [
    "विजय! कुछ मिनटों के लिए आराम करें। थोड़ा खिंचाव करें, पानी पीएं और अपनी आंखों को आराम दें।",
    "ब्रेक सक्रिय है। अपने दिमाग को आराम दें। आपका दिमाग अभी ज्ञान को संसोधित कर रहा है।",
    "रीचार्ज होने का समय। अगले प्रशिक्षण ब्लॉक से पहले एक त्वरित खिंचाव करें!"
  ],
  longBreak: [
    "एक अच्छी तरह से योग्य लंबा ब्रेक! अगले सत्र से पहले टहलें या नाश्ता करें।",
    "अधिकतम पुनर्प्राप्ति मोड। स्क्रीन से दूर हटें और अपनी आत्मा को तरोताजा करें!"
  ]
}

export default function FocusDojoPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState<number>(PRESETS.work.minutes * 60)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0)
  const [quoteIndex, setQuoteIndex] = useState<number>(0)
  const [customMinutes, setCustomMinutes] = useState<string>('')
  const [showFinishedAlert, setShowFinishedAlert] = useState<boolean>(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Web Audio API Sound Synthesizer (Zero-dependency sound chime)
  const playChime = () => {
    if (isMuted) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, start)
        gain.gain.setValueAtTime(0.25, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + duration)
      }

      // Manga level-up style chime (C5 -> E5 -> G5)
      playTone(523.25, ctx.currentTime, 0.2)
      playTone(659.25, ctx.currentTime + 0.1, 0.2)
      playTone(783.99, ctx.currentTime + 0.2, 0.35)
    } catch (e) {
      console.error("Synthesizer failed", e)
    }
  }

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, mode])

  const handleTimerComplete = () => {
    setIsRunning(false)
    playChime()
    setShowFinishedAlert(true)
    
    if (mode === 'work') {
      setSessionsCompleted((prev) => prev + 1)
    }

    setTimeout(() => {
      setShowFinishedAlert(false)
      // Auto switch states
      if (mode === 'work') {
        switchMode(sessionsCompleted % 3 === 2 ? 'longBreak' : 'shortBreak')
      } else {
        switchMode('work')
      }
    }, 4000)
  }

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false)
    setMode(newMode)
    setTimeLeft(PRESETS[newMode].minutes * 60)
    setQuoteIndex(Math.floor(Math.random() * OWL_QUOTES[newMode].length))
    setCustomMinutes('')
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    if (customMinutes) {
      setTimeLeft(parseInt(customMinutes) * 60)
    } else {
      setTimeLeft(PRESETS[mode].minutes * 60)
    }
  }

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseInt(customMinutes)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 180) {
      setIsRunning(false)
      setTimeLeft(parsed * 60)
    }
  }

  // Format time (seconds -> MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Progress percentage
  const totalPresetSeconds = PRESETS[mode].minutes * 60
  const activeTotalSeconds = customMinutes ? parseInt(customMinutes) * 60 : totalPresetSeconds
  const progressPercent = ((activeTotalSeconds - timeLeft) / activeTotalSeconds) * 100

  const currentPreset = PRESETS[mode]

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Halftone / Screentone matrix overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#161616_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none z-0 opacity-40" />

      {/* Speedlines backdrop when running */}
      <AnimatePresence>
        {isRunning && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-10">
            <SpeedLine duration={0.4} />
          </div>
        )}
      </AnimatePresence>

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
              { name: t('nav.focus'), href: '/features/focus-dojo', active: true },
              { name: t('nav.tasks'), href: '/features/task-quest', active: false },
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

        {/* Right side: Language, Mute and CTA */}
        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-full hover:bg-topper-charcoal border border-transparent hover:border-topper-graphite/40 text-topper-off-white/80 hover:text-topper-amber transition-colors cursor-pointer"
            title={isMuted ? t('focus.unmute') : t('focus.mute')}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-full hover:bg-topper-charcoal border border-transparent hover:border-topper-graphite/40 text-topper-off-white/80 hover:text-topper-amber transition-colors cursor-pointer"
            title={isMuted ? t('focus.unmute') : t('focus.mute')}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col justify-center items-center w-full px-6 relative z-10 py-12">
        
        {/* Soft center glowing radial focus aura */}
        <div 
          className="absolute w-72 h-72 rounded-full blur-[80px] opacity-25 transition-colors duration-1000 z-0 pointer-events-none"
          style={{
            backgroundColor: currentPreset.color,
            boxShadow: `0 0 120px 40px ${currentPreset.color}`
          }}
        />

        {/* Minimalist Subtitle Header */}
        <div className="text-xs md:text-sm font-black tracking-[0.25em] text-topper-off-white/80 uppercase mb-4 text-center z-10 flex items-center gap-1.5 selection:bg-transparent select-none">
          <span>{language === 'hi' ? 'कोई विकर्षण नहीं' : 'NO DISTRACTIONS'}</span>
          <span className="text-topper-amber text-sm font-normal">✨</span>
          <span className="font-mono text-topper-amber font-extrabold">{Math.round(activeTotalSeconds / 60)} {language === 'hi' ? 'मिनट' : 'MIN'}</span>
          <span className="font-light italic text-topper-off-white/70">{mode === 'work' ? (language === 'hi' ? 'अध्ययन विजय' : 'STUDY CONQUEST') : (language === 'hi' ? 'विश्राम चक्र' : 'REST CHAKRA')}</span>
        </div>

        {/* Giant Countdown digits (Interactive click-to-play) */}
        <div 
          onClick={toggleTimer}
          className="relative group cursor-pointer select-none z-10 flex flex-col items-center mb-8"
        >
          <motion.div 
            className="text-8xl sm:text-[10rem] font-black font-mono tracking-tight text-topper-off-white hover:text-topper-amber transition-colors drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] leading-none"
            animate={isRunning ? { scale: [1, 1.015, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            {formatTime(timeLeft)}
          </motion.div>
          
          {/* Hover helper text */}
          <div className="text-[10px] uppercase font-black tracking-widest text-topper-graphite group-hover:text-topper-amber/70 transition-colors mt-2 h-4">
            {isRunning 
              ? (language === 'hi' ? 'रोकने के लिए क्लिक करें' : "Click digits to pause block") 
              : (language === 'hi' ? 'फोकस शुरू करने के लिए क्लिक करें' : "Click digits to ignite focus")}
          </div>
        </div>

        {/* Animated Presets (hides during focus sessions) */}
        <AnimatePresence>
          {!isRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -15 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -15 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full flex flex-col items-center select-none overflow-hidden mb-6"
            >
              {/* Pill-Shaped Preset Selector Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                {(Object.keys(PRESETS) as TimerMode[]).map((key) => {
                  const preset = PRESETS[key]
                  const isActive = mode === key
                  return (
                    <button
                      key={key}
                      onClick={() => switchMode(key)}
                      className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-topper-off-white text-topper-black border-2 border-topper-off-white shadow-md'
                          : 'bg-transparent border-2 border-topper-off-white/30 text-topper-off-white/70 hover:border-topper-off-white hover:text-topper-off-white'
                      }`}
                    >
                      {key === 'work' ? t('focus.studyBlock') : key === 'shortBreak' ? t('focus.shortBreak') : t('focus.longBreak')}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls - Always visible, styled prominently */}
        <div className="flex gap-6 justify-center mb-8 z-10 select-none">
          <button 
            onClick={toggleTimer}
            className="px-10 py-4.5 rounded-full text-sm font-black uppercase tracking-widest transition-all cursor-pointer shadow-[5px_5px_0_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[7px_7px_0_rgba(0,0,0,1)] active:translate-y-0 active:translate-x-0 active:shadow-[2px_2px_0_rgba(0,0,0,1)] border-2"
            style={{
              backgroundColor: isRunning ? '#ff3b30' : currentPreset.color,
              color: isRunning ? '#ffffff' : '#0a0a0a',
              borderColor: isRunning ? '#ff3b30' : currentPreset.color
            }}
          >
            {isRunning ? t('focus.pause') : t('focus.start')}
          </button>
          <button 
            onClick={resetTimer}
            className="px-10 py-4.5 rounded-full border-2 border-topper-off-white text-topper-off-white bg-topper-charcoal/40 hover:bg-topper-off-white/10 hover:text-topper-off-white text-sm font-black uppercase tracking-widest transition-all shadow-[5px_5px_0_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[7px_7px_0_rgba(0,0,0,1)] active:translate-y-0 active:translate-x-0 active:shadow-[2px_2px_0_rgba(0,0,0,1)] cursor-pointer"
            title="Reset timer"
          >
            {t('focus.reset')}
          </button>
        </div>

        {/* Animated Custom Duration (hides during focus sessions) */}
        <AnimatePresence>
          {!isRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 15 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 15 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full flex flex-col items-center select-none overflow-hidden"
            >
              {/* Customize Training Duration Capsule - Enlarged and Noticeable */}
              <div className="w-full max-w-sm flex flex-col items-center mt-2">
                <form onSubmit={handleCustomTimeSubmit} className="flex items-center bg-topper-charcoal/95 border-2 border-topper-off-white/80 rounded-full p-2 focus-within:border-topper-amber focus-within:shadow-[0_0_20px_rgba(245,166,35,0.25)] shadow-[6px_6px_0_rgba(0,0,0,1)] transition-all w-fit">
                  <div className="flex items-center pl-4 pr-1.5">
                    <Settings className="w-5 h-5 text-topper-amber animate-pulse" />
                  </div>
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder={language === 'hi' ? 'कस्टम मिनट' : 'Custom Min'}
                    min="1"
                    max="180"
                    className="bg-transparent text-topper-off-white text-base px-2 py-2 w-32 focus:outline-none placeholder-topper-graphite text-center font-bold font-mono"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3 bg-topper-off-white hover:bg-topper-amber hover:text-topper-black text-topper-black rounded-full text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    {language === 'hi' ? 'लागू करें' : 'Apply'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating encouraging owl narrative (placed subtly above the progress bar) */}
      <footer className="w-full max-w-md px-6 z-10 mb-8 flex justify-center">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="w-full text-center"
        >
          <OwlSpeech 
            message={(language === 'hi' ? OWL_QUOTES_HI : OWL_QUOTES)[mode][quoteIndex % (language === 'hi' ? OWL_QUOTES_HI : OWL_QUOTES)[mode].length]} 
            delay={0.1} 
            position="center"
          />
        </motion.div>
      </footer>

      {/* Thin Horizontal progress line at the absolute bottom of the viewport */}
      <div className="w-full h-1 bg-topper-graphite/40 absolute bottom-0 left-0 z-20">
        <div 
          className="h-full bg-gradient-to-r transition-all duration-300"
          style={{ 
            width: `${progressPercent}%`,
            backgroundImage: `linear-gradient(to right, ${currentPreset.color}, ${currentPreset.color})`,
            boxShadow: `0 0 8px ${currentPreset.color}`
          }}
        />
      </div>

      {/* Full-screen Alert Banner Overlay (Time Completed Comic Splash) */}
      <AnimatePresence>
        {showFinishedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-topper-black/95 backdrop-blur-sm"
          >
            {/* Speedline background burst on complete */}
            <div className="absolute inset-0 opacity-40 pointer-events-none z-0">
              <SpeedLine duration={0.3} />
            </div>

            <motion.div
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.4, rotate: 20 }}
              transition={{ type: "spring", damping: 11 }}
              className="bg-topper-amber border-8 border-topper-black text-topper-black p-16 md:p-20 text-center max-w-lg mx-6 skew-y-[-2deg] relative z-10"
              style={{
                boxShadow: '20px 20px 0 #000, 0 0 60px rgba(245, 166, 35, 0.5)'
              }}
            >
              <h2 className="text-7xl md:text-8xl font-black uppercase tracking-tighter mb-6 leading-none select-none animate-bounce">
                {language === 'hi' ? <>डोजो<br/>विजित!</> : <>DOJO<br/>CONQUERED!</>}
              </h2>
              <p className="text-base font-black uppercase tracking-widest text-topper-black border-t-4 border-topper-black pt-4">
                {language === 'hi' ? 'ऊर्जा पुनर्जीवित' : 'CHAKRA RESTORED'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
