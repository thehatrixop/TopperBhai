'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { OwlSpeech, ComicActionButton, MangaPanel } from '@/components/manga-ui'
import { useLanguage } from '@/lib/LanguageContext'

const subjects = [
  {
    id: 'computer-science-and-application',
    name: 'Computer Science and Application',
    description: 'Complete domain covering UGC NET Computer Science and Application syllabus, including all 10 core units.',
    topics: 10,
    color: '#f5a623',
    icon: '💻',
  },
]


export default function SubjectsPage() {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = React.useState<string | null>(null)
  const { language, setLanguage, t } = useLanguage()

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId)
    setTimeout(() => {
      router.push(`/topics/${subjectId}`)
    }, 400)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  }

  const itemVariants: any = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  }

  return (
    <div className="min-h-screen bg-topper-black text-topper-off-white overflow-hidden">
      {/* Navigation */}
      <nav className="border-b-2 border-topper-graphite px-6 py-4 md:px-12 flex items-center justify-between">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ x: 0 }}
          onClick={() => router.push('/')}
          className="text-2xl font-bold tracking-tighter hover:text-topper-amber transition-colors"
        >
          ← {t('subjects.back')}
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
          <OwlSpeech message={t('subjects.owl')} delay={0.1} />
        </motion.div>

        {/* Section Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl md:text-6xl font-black mb-4 tracking-tighter"
        >
          {t('subjects.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-topper-off-white/70 text-lg max-w-2xl mb-16"
        >
          {t('subjects.subtitle')}
        </motion.p>

        {/* Subject Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
        >
          {subjects.map((subject) => (
            <motion.button
              key={subject.id}
              variants={itemVariants}
              onClick={() => handleSubjectSelect(subject.id)}
              className="relative group text-left"
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Selection indicator */}
              {selectedSubject === subject.id && (
                <motion.div
                  layoutId="selectedBorder"
                  className="absolute inset-0 border-3 border-topper-amber rounded-lg"
                  transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                />
              )}

              <MangaPanel className="p-8 bg-gradient-to-br from-topper-charcoal to-topper-graphite h-full group-hover:from-topper-graphite group-hover:to-topper-charcoal transition-all duration-300">
                {/* Icon */}
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {subject.icon}
                </div>

                {/* Subject Name */}
                <h3 className="text-3xl font-black mb-2 group-hover:text-topper-amber transition-colors">
                  {subject.id === 'computer-science-and-application' ? t('subjects.cs') : subject.name}
                </h3>

                {/* Topics Count */}
                <div className="mb-4 inline-block px-3 py-1 bg-topper-black border-2 border-topper-graphite rounded text-sm font-bold text-topper-amber">
                  {subject.topics} {t('subjects.topicsCount')}
                </div>

                {/* Description */}
                <p className="text-topper-off-white/70 text-sm leading-relaxed mb-6 whitespace-pre-line">
                  {subject.id === 'computer-science-and-application' ? t('subjects.cs.desc') : subject.description}
                </p>

                {/* Hover Action */}
                <div className="flex items-center gap-2 text-topper-amber font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>{t('subjects.select')}</span>
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    →
                  </motion.span>
                </div>

                {/* Comic impact effect on hover */}
                <motion.div
                  className="absolute top-4 right-4 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-topper-amber"
                  animate={{ scale: [0, 1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                  style={{ transformOrigin: 'center' }}
                />
              </MangaPanel>
            </motion.button>
          ))}
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 pt-12 border-t-2 border-topper-graphite"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: t('subjects.stat.topics'), value: '125+', icon: '📚' },
              { label: t('subjects.stat.questions'), value: t('subjects.stat.unlimited'), icon: '❓' },
              { label: t('subjects.stat.solutions'), value: t('subjects.stat.instant'), icon: '✓' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <p className="text-topper-graphite text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-topper-amber">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
