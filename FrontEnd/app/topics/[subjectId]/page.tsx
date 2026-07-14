'use client'

import React, { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { OwlSpeech, ComicActionButton, NetworkNode } from '@/components/manga-ui'
import { ChevronRight } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { TopicsPageSkeleton } from '@/components/Skeleton'
import { API_BASE_URL } from '@/lib/config'

// Topics are fetched dynamically from the backend database using the subject ID / slug.


export default function TopicsPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string
  const [subject, setSubject] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedTopics, setSelectedTopics] = React.useState<Set<string>>(new Set())
  const [isNavigating, setIsNavigating] = React.useState(false)
  const [includeNotes, setIncludeNotes] = React.useState(true)
  const [includeGenerated, setIncludeGenerated] = React.useState(true)
  const { language, setLanguage, t } = useLanguage()

  React.useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/topics/by-slug/${subjectId}`
        )

        const data = await response.json()

        // Simulate artificial delay to see the skeleton loading
        await new Promise(resolve => setTimeout(resolve, 2000))

        setSubject({
          id: subjectId,
          name: data.name,
          chapters: data.topics.map((t: any) => t.name)
        })
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadTopics()
  }, [subjectId])

  // Calculate network positions for topics — using uniform circular distance in wide layout
  const topicPositions = useMemo(() => {
    if (!subject) return {}
    const positions: Record<string, { x: number; y: number }> = {}
    const count = subject.chapters.length
    const centerX = 50
    const centerY = 50
    // In a 16:10 aspect ratio container, using radiusX = radiusY / 1.6 yields a perfect pixel-perfect circle.
    // This prevents top/bottom nodes from crowding the center while utilizing screen width.
    const radiusY = 36
    const radiusX = 22.5

    subject.chapters.forEach((chapter: string, index: number) => {
      // Add a microscopic offset (0.0001 rad) to avoid perfectly horizontal lines.
      // Perfectly horizontal/vertical SVG lines with gradients fail to render
      // because their bounding box width or height is exactly zero.
      const angle = (index / count) * Math.PI * 2 + 0.0001
      positions[chapter] = {
        x: centerX + radiusX * Math.cos(angle),
        y: centerY + radiusY * Math.sin(angle),
      }
    })
    return positions
  }, [subject])

  if (loading) {
    return <TopicsPageSkeleton />
  }
  if (!subject) {
    return (
      <div className="min-h-screen bg-topper-black text-topper-off-white flex items-center justify-center">
        <p>{language === 'hi' ? 'विषय नहीं मिला' : 'Subject not found'}</p>
      </div>
    )
  }

  const handleTopicToggle = (topic: string) => {
    const newSelected = new Set(selectedTopics)
    if (newSelected.has(topic)) {
      newSelected.delete(topic)
    } else {
      newSelected.add(topic)
    }
    setSelectedTopics(newSelected)
  }

  const handleContinue = () => {
    if (selectedTopics.size === 0 || !includeNotes) return
    setIsNavigating(true)
    setTimeout(() => {
      router.push(
        `/difficulty/${subjectId}?topics=${Array.from(selectedTopics).join(',')}&notes=${includeNotes}&generated=${includeGenerated}`
      )
    }, 400)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.2 },
    },
  }

  const itemVariants: any = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 200, damping: 25 },
    },
  }

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white overflow-hidden">
      {/* Navigation */}
      <nav className="border-b-2 border-topper-graphite px-6 py-4 md:px-12 flex items-center justify-between">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ x: 0 }}
          onClick={() => router.push('/subjects')}
          className="text-2xl font-bold tracking-tighter hover:text-topper-amber transition-colors"
        >
          ← {subject.id === 'computer-science-and-application' ? t('subjects.cs') : subject.name}
        </motion.button>
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
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16">
        {/* Owl Narrative */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <OwlSpeech message={t('topics.owl')} delay={0.1} />
        </motion.div>

        {/* Section Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-6xl font-black mb-4 tracking-tighter"
        >
          {t('topics.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-topper-off-white/70 text-lg mb-12"
        >
          {selectedTopics.size > 0
            ? `${selectedTopics.size} ${t('topics.selectedCount')}`
            : t('topics.selectAtLeastOne')}
        </motion.p>

        {/* Network Visualization */}
        <motion.div
          className="relative bg-[#121212] border-2 border-topper-graphite rounded-lg mb-12 aspect-[16/10] max-w-4xl mx-auto overflow-visible shadow-lg"
          style={{
            backgroundImage: 'radial-gradient(rgba(245, 166, 35, 0.07) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* SVG for connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5a623" />
                <stop offset="100%" stopColor="#00d9ff" />
              </linearGradient>
            </defs>


            {/* Center circle */}
            <circle cx="50%" cy="50%" r="8" fill="#f5a623" opacity="0.5" />

            {/* Lines from center to nodes */}
            {subject.chapters.map((chapter: string, idx: number) => {
              const pos = topicPositions[chapter]
              const isSelected = selectedTopics.has(chapter)
              return (
                <motion.line
                  key={`line-${chapter}`}
                  x1="50%"
                  y1="50%"
                  x2={`${pos.x}%`}
                  y2={`${pos.y}%`}
                  stroke={isSelected ? "#f5a623" : "url(#connectionGradient)"}
                  strokeWidth={isSelected ? "2" : "1.2"}
                  opacity={isSelected ? 1 : 0.15}
                  style={{ transition: 'stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease' }}
                  animate={{
                    x: [
                      0,
                      Math.sin(idx * 1.7) * 15,
                      Math.cos(idx * 2.3) * -12,
                      Math.sin(idx * 0.9) * -10,
                      Math.cos(idx * 3.1) * 8,
                      0
                    ],
                    y: [
                      0,
                      Math.cos(idx * 1.3) * 15,
                      Math.sin(idx * 2.7) * -12,
                      Math.cos(idx * 0.7) * -10,
                      Math.sin(idx * 3.5) * 8,
                      0
                    ]
                  }}
                  transition={{
                    duration: 8 + (idx % 5) * 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )
            })}
          </svg>

          {/* Center node */}
          <motion.div
            className="absolute left-1/2 top-1/2 w-14 h-14 -ml-7 -mt-7 bg-topper-amber rounded-full border-2 border-topper-off-white flex items-center justify-center font-black text-topper-black z-10 text-xs tracking-wider shadow-[0_0_15px_rgba(245,166,35,0.25)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {subject.name.split(' ').map((w: string) => w[0]).join('')}
          </motion.div>

          {/* Topic nodes */}
          <motion.div className="relative w-full h-full">
            {subject.chapters.map((chapter: string, idx: number) => {
              const pos = topicPositions[chapter]
              const isSelected = selectedTopics.has(chapter)
              const rotation = (idx % 2 === 0 ? 1 : -1) * 1.5
              const isLeftSide = pos.x < 50
              const unitNum = String(idx + 1).padStart(2, '0')

              return (
                <motion.div
                  key={chapter}
                  className="absolute"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  }}
                  variants={itemVariants}
                >
                  <motion.div
                    className="relative"
                    animate={{
                      x: [
                        0,
                        Math.sin(idx * 1.7) * 15,
                        Math.cos(idx * 2.3) * -12,
                        Math.sin(idx * 0.9) * -10,
                        Math.cos(idx * 3.1) * 8,
                        0
                      ],
                      y: [
                        0,
                        Math.cos(idx * 1.3) * 15,
                        Math.sin(idx * 2.7) * -12,
                        Math.cos(idx * 0.7) * -10,
                        Math.sin(idx * 3.5) * 8,
                        0
                      ],
                      rotate: [
                        0,
                        Math.sin(idx * 1.1) * 3,
                        Math.cos(idx * 1.9) * -2,
                        Math.sin(idx * 2.5) * 2,
                        Math.cos(idx * 0.5) * -1.5,
                        0
                      ]
                    }}
                    transition={{
                      duration: 8 + (idx % 5) * 2.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {/* The Knob (exactly centered at pos.x, pos.y) */}
                    <motion.button
                      onClick={() => handleTopicToggle(chapter)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className={`absolute w-9 h-9 -ml-[18px] -mt-[18px] rounded-full flex items-center justify-center font-black text-xs border-2 transition-all duration-300 z-20 cursor-pointer ${
                        isSelected 
                          ? 'bg-topper-amber border-topper-amber text-topper-black shadow-[0_0_12px_rgba(245,166,35,0.6)]' 
                          : 'bg-[#1a1a1a] border-[#3a3a3a] text-topper-off-white/80 hover:border-topper-amber hover:text-topper-amber'
                      }`}
                    >
                      {unitNum}
                    </motion.button>

                    {/* The Label Tag (aligned left or right of the knob) */}
                    <div
                      className={`absolute top-0 -mt-[18px] w-36 px-2.5 py-1.5 rounded-md border-2 transition-all duration-300 bg-[#121212]/95 select-none text-[10px] font-black shadow-[3px_3px_0_#000000] text-center leading-tight cursor-pointer ${
                        isLeftSide 
                          ? 'right-6 mr-2' 
                          : 'left-6 ml-2'
                      } ${
                        isSelected
                          ? 'border-topper-amber text-topper-amber shadow-[3px_3px_0_rgba(245,166,35,0.25)]'
                          : 'border-[#2a2a2a] text-topper-off-white/70 hover:border-topper-amber/50'
                      }`}
                      style={{ transform: `rotate(${rotation}deg)` }}
                      onClick={() => handleTopicToggle(chapter)}
                    >
                      {chapter}
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </motion.div>

        </motion.div>

        {/* Topic List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h3 className="text-xl font-bold mb-4 text-topper-amber">{t('topics.selectedChapters')}</h3>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selectedTopics.size === 0 ? (
                <motion.p className="text-topper-graphite italic">
                  {t('topics.noTopicsSelected')}
                </motion.p>
              ) : (
                Array.from(selectedTopics).map((topic) => (
                  <motion.button
                    key={topic}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => handleTopicToggle(topic)}
                    className="px-4 py-2 bg-topper-amber text-topper-black font-bold rounded-md border-2 border-topper-amber hover:bg-topper-off-white transition-colors"
                  >
                    {topic} ×
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Source Material Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-12 p-6 bg-[#121212] border-2 border-topper-graphite rounded-lg relative overflow-hidden shadow-md"
        >
          <h3 className="text-xl font-black mb-4 tracking-tight text-topper-amber flex items-center gap-2">
            <span>⚙️</span> {t('topics.studyMaterials')}
          </h3>
          <p className="text-sm text-topper-off-white/60 mb-6">
            {t('topics.studyMaterialsDesc')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
            {/* Notes Card */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setIncludeNotes(!includeNotes)}
              className={`p-5 rounded-lg border-2 text-left flex items-start gap-4 transition-all duration-300 relative group overflow-hidden ${
                includeNotes
                  ? 'bg-gradient-to-br from-topper-amber/10 to-transparent border-topper-amber text-topper-amber shadow-[0_0_15px_rgba(245,166,35,0.1)]'
                  : 'bg-[#181818] border-topper-graphite text-topper-off-white/70 hover:border-topper-amber/40 hover:text-topper-amber/80'
              }`}
            >
              <div className="text-3xl p-2 bg-topper-black/50 border border-topper-graphite/30 rounded-md">
                📚
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-bold text-base mb-1 tracking-tight">{t('topics.includeNotes')}</h4>
                <p className={`text-xs leading-relaxed transition-colors ${includeNotes ? 'text-topper-off-white/80' : 'text-topper-off-white/50'}`}>
                  {t('topics.includeNotesDesc')}
                </p>
              </div>
              <div className={`mt-1 w-6 h-6 rounded-md flex items-center justify-center font-black text-sm border-2 transition-all duration-200 ${
                includeNotes 
                  ? 'border-topper-amber bg-topper-amber text-topper-black' 
                  : 'border-topper-graphite/60 bg-transparent'
              }`}>
                {includeNotes && '✓'}
              </div>
            </motion.button>

            {/* Generated Card */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setIncludeGenerated(!includeGenerated)}
              className={`p-5 rounded-lg border-2 text-left flex items-start gap-4 transition-all duration-300 relative group overflow-hidden ${
                includeGenerated
                  ? 'bg-gradient-to-br from-topper-amber/10 to-transparent border-topper-amber text-topper-amber shadow-[0_0_15px_rgba(245,166,35,0.1)]'
                  : 'bg-[#181818] border-topper-graphite text-topper-off-white/70 hover:border-topper-amber/40 hover:text-topper-amber/80'
              }`}
            >
              <div className="text-3xl p-2 bg-topper-black/50 border border-topper-graphite/30 rounded-md">
                ⚡
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-bold text-base mb-1 tracking-tight">{t('topics.includeGenerated')}</h4>
                <p className={`text-xs leading-relaxed transition-colors ${includeGenerated ? 'text-topper-off-white/80' : 'text-topper-off-white/50'}`}>
                  {t('topics.includeGeneratedDesc')}
                </p>
              </div>
              <div className={`mt-1 w-6 h-6 rounded-md flex items-center justify-center font-black text-sm border-2 transition-all duration-200 ${
                includeGenerated 
                  ? 'border-topper-amber bg-topper-amber text-topper-black' 
                  : 'border-topper-graphite/60 bg-transparent'
              }`}>
                {includeGenerated && '✓'}
              </div>
            </motion.button>
          </div>

          {!includeNotes && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs font-bold mt-4"
            >
              ⚠️ {t('topics.warningSelectSource')}
            </motion.p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col md:flex-row gap-4 items-center justify-between pt-8 border-t-2 border-topper-graphite"
        >
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ x: 0 }}
            onClick={() => router.push('/subjects')}
            className="px-6 py-3 text-topper-amber font-bold hover:text-topper-off-white transition-colors"
          >
            ← {t('topics.back')}
          </motion.button>

          <ComicActionButton
            onClick={handleContinue}
            disabled={selectedTopics.size === 0 || (!includeNotes && !includePyqs) || isNavigating}
            className={(selectedTopics.size === 0 || (!includeNotes && !includePyqs)) ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {t('topics.configureDifficulty')}
            <ChevronRight className="w-5 h-5" />
          </ComicActionButton>
        </motion.div>
      </div>
    </div>
  )
}
