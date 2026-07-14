'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SpeedLine } from '@/components/manga-ui'
import { 
  Search,
  Play,
  Info,
  X,
  Loader2,
  Tv,
  Sparkles,
  Clock,
  ThumbsUp,
  BookOpen,
  ChevronDown,
  Menu,
  ChevronRight
} from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { ConceptDojoSkeleton } from '@/components/Skeleton'
import { API_BASE_URL } from '@/lib/config'

interface VideoRecommendation {
  video_id: string
  title: string
  channel: string
  duration: string
  views_text: string
  relevance_score: number
  recommendation_reason: string
}

interface RecommendResponse {
  recommendations: VideoRecommendation[]
  rejection_message?: string
}

const TOPIC_PRESETS = [
  { name: 'Binary Search Trees', subject: 'Data Structures' },
  { name: 'CPU Scheduling Algorithms', subject: 'Operating Systems' },
  { name: 'SQL Joins Explained', subject: 'Database Systems' },
  { name: 'TCP 3-Way Handshake', subject: 'Computer Networks' }
]

export default function ConceptDojoPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Input & search states
  const [chapterQuery, setChapterQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RecommendResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Active featured video state (defaults to recommendations[0])
  const [featuredVideo, setFeaturedVideo] = useState<VideoRecommendation | null>(null)

  // Player modal state
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)

  // Info details popup state
  const [showInfoModal, setShowInfoModal] = useState<VideoRecommendation | null>(null)

  const resultsRef = useRef<HTMLDivElement>(null)

  const handleRecommend = async (queryTopic: string) => {
    if (!queryTopic.trim()) return

    setLoading(true)
    setErrorMsg('')
    setResults(null)
    setFeaturedVideo(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/video/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chapter_name: queryTopic
        })
      })

      if (!response.ok) {
        throw new Error('Failed to retrieve video recommendations. Verify backend is active.')
      }

      const data: RecommendResponse = await response.json()
      // Simulate artificial delay to see the skeleton loading
      await new Promise(resolve => setTimeout(resolve, 2000))
      setResults(data)

      if (data.recommendations && data.recommendations.length > 0) {
        setFeaturedVideo(data.recommendations[0])
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 150)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'An error occurred while fetching video details.')
    } finally {
      setLoading(false)
    }
  }

  const triggerSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleRecommend(chapterQuery)
  }

  const selectPreset = (topicName: string) => {
    setChapterQuery(topicName)
    handleRecommend(topicName)
  }

  // Get high-res YouTube thumbnail URL with fallback
  const getThumbnailUrl = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/0.jpg`
  }

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white flex flex-col justify-between items-center relative overflow-hidden font-sans pb-20">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(#161616_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none z-0 opacity-40" />

      {/* Speed lines backdrop during load */}
      <AnimatePresence>
        {loading && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-15">
            <SpeedLine duration={0.3} />
          </div>
        )}
      </AnimatePresence>

      {/* Header Nav */}
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
              { name: t('nav.concept'), href: '/features/concept-dojo', active: true },
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

      {/* Main Body */}
      <main className="flex-1 w-full relative z-10 flex flex-col items-center">
        
        {/* Search Console (Netflix-style initial search layout) */}
        <div className="w-full max-w-4xl px-4 md:px-6 pt-12 flex flex-col items-center select-none text-center mb-10">
          
          {/* Glowing 3D Glassmorphic Energy Orb */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 blur-xl opacity-40 scale-125 animate-pulse" />
            <motion.div
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-orange-800 via-amber-600 to-yellow-400 shadow-[0_0_40px_rgba(245,158,11,0.5),inset_-8px_-8px_25px_rgba(0,0,0,0.8),inset_8px_8px_15px_rgba(255,255,255,0.4)] border border-amber-500/20 animate-pulse-glow"
            >
              {/* Orb Highlight */}
              <div className="absolute top-2.5 left-4 w-5 h-2.5 rounded-full bg-white/30 blur-[0.5px] rotate-[-15deg]" />
            </motion.div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-balance max-w-xl">
            {language === 'hi' ? 'अवधारणा वीडियो' : 'Concept Video'} <span className="text-topper-amber">{language === 'hi' ? 'डोजो' : 'Dojo'}</span>
          </h1>
          <p className="text-sm md:text-base text-topper-off-white/80 mt-2 max-w-md">
            {t('concept.subtitle')}
          </p>

          {/* Search Box */}
          <form onSubmit={triggerSearch} className="w-full max-w-xl mt-8 relative">
            <div className="relative flex items-center bg-topper-charcoal border-2 border-topper-graphite focus-within:border-topper-amber focus-within:shadow-[0_0_20px_rgba(245,166,35,0.15)] rounded-full overflow-hidden px-4.5 py-1 transition-all shadow-[4px_4px_0_rgba(0,0,0,1)]">
              <Search className="w-5 h-5 text-topper-graphite mr-3 flex-shrink-0" />
              <input
                type="text"
                value={chapterQuery}
                onChange={(e) => setChapterQuery(e.target.value)}
                placeholder={t('concept.placeholder')}
                className="w-full bg-transparent text-sm text-topper-off-white placeholder-topper-graphite py-3 focus:outline-none font-semibold"
                required
              />
              <button
                type="submit"
                disabled={loading || !chapterQuery.trim()}
                className="bg-topper-amber text-topper-black hover:bg-white font-black text-xs uppercase px-6 py-2.5 rounded-full transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer border border-topper-black/10 ml-2"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (language === 'hi' ? 'खोजें' : 'Search')}
              </button>
            </div>
          </form>

          {/* Preset Suggestions */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl">
            {TOPIC_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => selectPreset(preset.name)}
                disabled={loading}
                className="px-3.5 py-1.5 bg-topper-charcoal/60 border border-topper-graphite/60 hover:border-topper-amber rounded-full text-xs font-bold text-topper-off-white/90 hover:text-topper-amber transition-all cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3 h-3" />
                <span>{preset.name}</span>
                <span className="text-[9px] text-topper-graphite font-semibold px-1.5 py-0.2 bg-topper-black rounded-full">
                  {preset.subject}
                </span>
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="bg-red-950/40 border border-red-800 rounded-lg p-3.5 text-xs text-red-400 max-w-xl w-full mt-6 text-left flex items-start gap-2.5">
              <X className="w-4 h-4 mt-0.5 flex-shrink-0 cursor-pointer hover:text-red-300" onClick={() => setErrorMsg('')} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {loading && <ConceptDojoSkeleton />}

        {/* Results Section */}
        <AnimatePresence>
          {results && !loading && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full select-none"
            >
              
              {/* Rejection Message for non-academic topics */}
              {results.rejection_message && (
                <div className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative bg-topper-charcoal border-4 border-topper-graphite p-10 rounded-2xl shadow-[8px_8px_0_rgba(0,0,0,1)] max-w-xl w-full flex flex-col items-center text-center overflow-hidden"
                  >
                    {/* Manga style design patterns */}
                    <div className="absolute inset-0 bg-[radial-gradient(#f5a623_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-5" />
                    <div className="absolute inset-3 border border-dashed border-topper-graphite/40 pointer-events-none rounded-xl" />

                    {/* Glowing background behind badge */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-topper-amber/10 blur-2xl rounded-full pointer-events-none" />

                    {/* Top Icon Badge */}
                    <div className="relative mb-6 z-10 w-16 h-16 rounded-2xl bg-topper-amber text-topper-black flex items-center justify-center border-2 border-black/80 shadow-[3px_3px_0_rgba(0,0,0,1)] skew-x-[-6deg]">
                      <Sparkles className="w-8 h-8 fill-topper-black text-topper-black animate-pulse" />
                    </div>

                    {/* Header */}
                    <h3 className="text-2xl font-black uppercase text-topper-amber tracking-tighter mb-4 skew-x-[-4deg] relative z-10">
                      {language === 'hi' ? 'डोजो सूचना' : 'DOJO NOTICE'}
                    </h3>

                    {/* Rejection Message */}
                    <p className="text-base md:text-lg font-bold text-topper-off-white leading-relaxed max-w-md relative z-10 px-2 italic">
                      "{results.rejection_message}"
                    </p>

                    {/* Footer decoration */}
                    <div className="w-16 h-1 bg-topper-graphite/60 rounded-full mt-6 mb-4 relative z-10" />
                    <span className="text-[10px] text-topper-graphite font-mono uppercase tracking-[0.2em] relative z-10">
                      // {language === 'hi' ? 'चक्र पुनर्जीवित • अध्ययन विषय चुनें' : 'CHAKRA RESTORED • CHOOSE A STUDY TOPIC'}
                    </span>
                  </motion.div>
                </div>
              )}

              {/* Featured #1 Video — Split Layout */}
              {featuredVideo && (
                <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center py-8 lg:py-12">
                    
                    {/* Left: Info */}
                    <motion.div 
                      key={featuredVideo.video_id + '-info'}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col justify-center"
                    >
                      {/* Badge Row */}
                      <div className="flex items-center gap-2.5 mb-5">
                        <span className="bg-topper-amber text-topper-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {language === 'hi' ? 'सर्वश्रेष्ठ मिलान' : 'TOP MATCH'}
                        </span>
                        <span className="text-sm font-bold text-green-400">
                          {featuredVideo.relevance_score}% {language === 'hi' ? 'मिलान' : 'Match'}
                        </span>
                      </div>

                      {/* Featured Title */}
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-topper-off-white mb-4">
                        {featuredVideo.title}
                      </h2>

                      {/* Meta Row */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-topper-off-white/60 font-medium mb-6">
                        <span className="text-topper-amber font-semibold">{featuredVideo.channel}</span>
                        <span className="w-1 h-1 rounded-full bg-topper-graphite" />
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {featuredVideo.duration}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-topper-graphite" />
                        <span>{featuredVideo.views_text}</span>
                      </div>

                      {/* Tutor Recommendation */}
                      <p className="text-sm text-topper-off-white/70 leading-relaxed max-w-md mb-8">
                        {featuredVideo.recommendation_reason}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setActivePlayerId(featuredVideo.video_id)}
                          className="bg-topper-amber text-topper-black font-bold text-sm px-7 py-3 rounded-full flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(245,166,35,0.25)] hover:shadow-[0_0_30px_rgba(245,166,35,0.45)] hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <Play className="w-4 h-4 fill-topper-black" /> {t('concept.watch')}
                        </button>
                        <button
                          onClick={() => setShowInfoModal(featuredVideo)}
                          className="bg-topper-charcoal/80 border border-topper-graphite/60 text-topper-off-white/90 font-semibold text-sm px-7 py-3 rounded-full flex items-center gap-2.5 transition-all duration-200 cursor-pointer hover:border-topper-off-white/40 hover:bg-topper-charcoal"
                        >
                          <Info className="w-4 h-4" /> {t('concept.info')}
                        </button>
                      </div>
                    </motion.div>

                    {/* Right: #1 Featured Thumbnail */}
                    <motion.div
                      key={featuredVideo.video_id + '-thumb'}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="relative rounded-2xl overflow-hidden group cursor-pointer ring-2 ring-topper-amber/40 shadow-[0_0_30px_rgba(245,166,35,0.15)]"
                      onClick={() => setActivePlayerId(featuredVideo.video_id)}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-topper-charcoal">
                        <img
                          src={getThumbnailUrl(featuredVideo.video_id)}
                          alt={featuredVideo.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                          <div className="w-16 h-16 rounded-full bg-topper-amber/90 flex items-center justify-center shadow-xl backdrop-blur-sm">
                            <Play className="w-7 h-7 fill-topper-black text-topper-black ml-0.5" />
                          </div>
                        </div>

                        {/* Rank #1 badge */}
                        <div className="absolute top-3 left-3 bg-topper-amber text-topper-black px-2.5 py-1 rounded-lg text-xs font-black">
                          #1 RANKED
                        </div>
                      </div>
                    </motion.div>

                  </div>
                </div>
              )}

              {/* Remaining Videos Grid (#2–#5) — Original Poster Cards */}
              {results.recommendations.length > 1 && (
                <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 mt-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-topper-graphite/30 pb-2">
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-topper-off-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-topper-amber animate-pulse" />
                      {t('concept.recommendations')}
                    </h3>
                    <span className="text-xs text-topper-graphite font-bold">{language === 'hi' ? 'विशेष प्रदर्शित करने के लिए क्लिक करें' : 'Click to feature'}</span>
                  </div>

                  {/* Horizontal Posters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {results.recommendations.slice(1).map((video, index) => {
                      const isSelected = featuredVideo?.video_id === video.video_id
                      const realIndex = index + 1
                      return (
                        <motion.div
                          key={video.video_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: realIndex * 0.08, duration: 0.4 }}
                          whileHover={{ y: -6, scale: 1.02 }}
                          onClick={() => setFeaturedVideo(video)}
                          className={`bg-topper-charcoal rounded-xl overflow-hidden cursor-pointer border-2 shadow-lg transition-all group flex flex-col justify-between ${
                            isSelected 
                              ? 'border-topper-amber shadow-[0_0_15px_rgba(245,166,35,0.25)]' 
                              : 'border-topper-graphite/60 hover:border-topper-amber/70'
                          }`}
                        >
                          {/* Poster Thumbnail */}
                          <div className="relative aspect-video w-full overflow-hidden bg-black">
                            <img
                              src={getThumbnailUrl(video.video_id)}
                              alt={video.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            {/* Match Score Tag Overlay */}
                            <div className="absolute top-2 left-2 bg-topper-black/85 border border-topper-graphite/60 px-2 py-0.5 rounded text-[10px] font-black text-green-400 flex items-center gap-0.5">
                              <ThumbsUp className="w-3 h-3 fill-green-400/20" />
                              {video.relevance_score}%
                            </div>
                            
                            {/* Duration Badge */}
                            <div className="absolute bottom-2 right-2 bg-topper-black/90 px-1.5 py-0.5 rounded text-[9px] font-mono text-topper-off-white flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-topper-amber" />
                              {video.duration}
                            </div>

                            {/* Index indicator */}
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-topper-black/80 border border-topper-graphite/60 text-[10px] font-black flex items-center justify-center text-topper-amber">
                              #{realIndex + 1}
                            </div>
                          </div>

                          {/* Card Info Body */}
                          <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-black uppercase text-topper-off-white group-hover:text-topper-amber transition-colors line-clamp-2 leading-tight">
                                {video.title}
                              </h4>
                              <p className="text-[10px] text-topper-graphite font-bold mt-1">
                                {video.channel}
                              </p>
                            </div>
                            <div className="text-[10px] text-topper-graphite font-mono mt-2 pt-2 border-t border-topper-graphite/20 flex justify-between items-center">
                              <span>{video.views_text}</span>
                              <span className="text-[9px] bg-topper-amber/10 text-topper-amber px-1.5 py-0.2 rounded border border-topper-amber/20 font-black">
                                RANK #{realIndex + 1}
                              </span>
                            </div>
                          </div>

                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Embedded YouTube Player Modal */}
      <AnimatePresence>
        {activePlayerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-topper-black/95 backdrop-blur-sm p-4"
          >
            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-topper-charcoal border-4 border-topper-graphite rounded-xl w-full max-w-4xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Modal Header */}
              <div className="px-4 py-3 bg-topper-graphite/40 border-b border-topper-graphite flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-topper-amber flex items-center gap-1.5">
                  <Tv className="w-4 h-4" /> Concept Dojo Theater
                </span>
                <button
                  onClick={() => setActivePlayerId(null)}
                  className="p-1 rounded-full hover:bg-topper-graphite/60 text-topper-off-white hover:text-topper-amber transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* YouTube Iframe Player */}
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activePlayerId}?autoplay=1&rel=0&modestbranding=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Details Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-topper-black/90 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-topper-charcoal border-4 border-topper-graphite rounded-xl w-full max-w-lg p-6 relative shadow-2xl"
            >
              <button
                onClick={() => setShowInfoModal(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-topper-graphite/60 text-topper-off-white hover:text-topper-amber transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-topper-cyan/15 border border-topper-cyan/30 text-topper-cyan px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {language === 'hi' ? 'AI विश्लेषण रिपोर्ट' : 'AI Analysis Report'}
                  </span>
                  <span className="text-xs font-semibold text-green-400">
                    {showInfoModal.relevance_score}% {t('concept.relevance')} Match
                  </span>
                </div>

                <h3 className="text-lg font-black uppercase text-topper-off-white leading-tight pr-6">
                  {showInfoModal.title}
                </h3>

                <div className="text-xs text-topper-graphite space-y-1">
                  <p><strong>{language === 'hi' ? 'चैनल' : 'Channel'}:</strong> <span className="text-topper-off-white/80">{showInfoModal.channel}</span></p>
                  <p><strong>{t('concept.duration')}</strong> <span className="text-topper-off-white/80">{showInfoModal.duration}</span></p>
                  <p><strong>{t('concept.views')}</strong> <span className="text-topper-off-white/80">{showInfoModal.views_text}</span></p>
                </div>

                <div className="border-t border-topper-graphite/40 pt-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-topper-amber">
                    {language === 'hi' ? 'ट्यूटर अनुशंसा तर्क' : 'Tutor recommendation logic'}
                  </h4>
                  <p className="text-xs text-topper-off-white/90 leading-relaxed bg-topper-black/40 p-3 rounded-lg border border-topper-graphite/20">
                    {showInfoModal.recommendation_reason}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      const vid = showInfoModal.video_id
                      setShowInfoModal(null)
                      setActivePlayerId(vid)
                    }}
                    className="bg-topper-amber text-topper-black hover:bg-white font-black text-xs uppercase px-6 py-2.5 rounded shadow-md transition-colors cursor-pointer"
                  >
                    {t('concept.watch')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
