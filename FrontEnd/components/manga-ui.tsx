import React from 'react'
import { motion } from 'framer-motion'

interface OwlSpeechProps {
  message: string
  position?: 'left' | 'right' | 'center'
  delay?: number
}

export function OwlSpeech({ message, position = 'left', delay = 0 }: OwlSpeechProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={`relative mb-4 ${
        position === 'right' ? 'text-right' : position === 'center' ? 'text-center' : ''
      }`}
    >
      <div className={`inline-block max-w-xs px-6 py-3 bg-topper-charcoal border-2 border-topper-off-white rounded-lg relative ${
        position === 'right' ? 'ml-auto' : position === 'center' ? 'mx-auto' : ''
      }`}>
        <p className="text-topper-off-white font-semibold text-sm leading-relaxed">{message}</p>
      </div>
    </motion.div>
  )
}

interface ComicActionButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function ComicActionButton({
  children,
  onClick,
  disabled = false,
  className = '',
}: ComicActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95, y: 0 }}
      onClick={onClick}
      disabled={disabled}
      className={`comic-action-btn ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  )
}

interface MangaPanelProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function MangaPanel({ children, className = '', delay = 0 }: MangaPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotate: -1 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, amount: 0.3 }}
      className={`manga-panel ${className}`}
    >
      {children}
    </motion.div>
  )
}

interface SpeedLineProps {
  duration?: number
}

export function SpeedLine({ duration = 0.4 }: SpeedLineProps) {
  return (
    <motion.div
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: '100%', opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, ease: 'easeInOut' }}
      className="absolute h-px bg-gradient-to-r from-transparent via-topper-amber to-transparent"
      style={{ width: '100%', top: '50%' }}
    />
  )
}

interface NetworkNodeProps {
  label: string
  isSelected?: boolean
  onClick?: () => void
}

export function NetworkNode({ label, isSelected = false, onClick }: NetworkNodeProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`network-node ${isSelected ? 'selected' : ''}`}
    >
      <span className="text-xs font-bold text-center px-1 text-topper-black dark:text-topper-charcoal">
        {label}
      </span>
    </motion.button>
  )
}

interface LoadingPanelSequenceProps {
  steps: string[]
  currentStep?: number
}

export function LoadingPanelSequence({ steps, currentStep = 0 }: LoadingPanelSequenceProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: index <= currentStep ? 1 : 0.3, 
            x: 0 
          }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="loading-panel"
        >
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
              index <= currentStep 
                ? 'bg-topper-amber border-topper-amber text-topper-black' 
                : 'border-topper-graphite text-topper-graphite'
            }`}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className={`font-semibold ${
              index <= currentStep ? 'text-topper-off-white' : 'text-topper-graphite'
            }`}>
              {step}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
