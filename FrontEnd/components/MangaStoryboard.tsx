'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, RefreshCw, AlertCircle, BookOpen, User, MessageCircle } from 'lucide-react'
import { API_BASE_URL } from '@/lib/config'

interface Dialogue {
  character: string
  line: string
}

interface Panel {
  panel_number: number
  scene_description: string
  narration: string
  visual_intensity: 'rookie' | 'power-up' | 'ultimate' | 'explosion'
  dialogues: Dialogue[]
}

interface StoryboardData {
  title: string
  topic: string
  panels: Panel[]
}

interface MangaStoryboardProps {
  topic: string
  notes?: string
}

const ACTION_SOUNDS = {
  rookie: 'ZIP!',
  'power-up': 'WHOOOSH!',
  ultimate: 'SHIIING!',
  explosion: 'KABOOM!'
}

const PANEL_STYLES = [
  'col-span-12 md:col-span-12', // panel 1
  'col-span-12 md:col-span-6',  // panel 2
  'col-span-12 md:col-span-6',  // panel 3
  'col-span-12 md:col-span-12', // panel 4
  'col-span-12 md:col-span-12'  // panel 5
]

export default function MangaStoryboard({ topic, notes = '' }: MangaStoryboardProps) {
  const [loading, setLoading] = useState(false)
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchStoryboard = async () => {
    if (!topic) return
    setLoading(true)
    setErrorMsg('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manga/generate-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic,
          notes: notes || `Standard textbook information about ${topic}`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate storyboard. Make sure the backend server is running.')
      }

      const data = await response.json()
      setStoryboard(data)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error communicating with storyboard API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStoryboard()
  }, [topic])

  return (
    <div className="w-full bg-zinc-950 rounded-3xl p-6 md:p-8 border border-zinc-800 shadow-2xl relative overflow-hidden">
      {/* Background manga speedlines overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-20" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-800 pb-5 mb-8 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-topper-amber text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-topper-amber" />
            AI Visual Storyboard
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
            {storyboard?.title || `Manga Dojo: ${topic}`}
          </h2>
        </div>

        <button
          onClick={fetchStoryboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs rounded-full border border-zinc-800 active:scale-95 transition-all cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-topper-amber" />
          ) : (
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          )}
          Generate Storyboard
        </button>
      </div>

      {loading && (
        <div className="py-24 flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-topper-amber" />
            <div className="absolute inset-0 bg-topper-amber/10 rounded-full filter blur-xl animate-pulse" />
          </div>
          <div className="text-sm font-bold text-zinc-400 animate-pulse text-center">
            Illustrating storyboard panels...<br />
            <span className="text-xs font-normal text-zinc-500">Sketching characters and action blocks...</span>
          </div>
        </div>
      )}

      {errorMsg && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex flex-col items-center text-center gap-3 relative z-10">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <div className="text-sm font-bold text-red-200">{errorMsg}</div>
          <button 
            onClick={fetchStoryboard} 
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-full transition-colors cursor-pointer"
          >
            Retry Generation
          </button>
        </div>
      )}

      {storyboard && !loading && (
        <div className="grid grid-cols-12 gap-6 relative z-10">
          {storyboard.panels.map((panel, idx) => {
            const panelCol = PANEL_STYLES[idx] || 'col-span-12'
            const actionText = ACTION_SOUNDS[panel.visual_intensity] || 'SHHH!'
            
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`${panelCol} min-h-[300px] bg-zinc-900 border-4 border-black rounded-2xl relative overflow-hidden shadow-[4px_4px_0px_#000] flex flex-col justify-between p-5 md:p-6 group`}
              >
                {/* Visual Action Indicator Background (Speedlines style) */}
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#000000_25%,transparent_25%),linear-gradient(-45deg,#000000_25%,transparent_25%)] [background-size:10px_10px] pointer-events-none opacity-5 transition-opacity group-hover:opacity-10" />

                {/* Top Action Header: Narration Box */}
                <div className="bg-amber-400 text-black px-3 py-1.5 font-extrabold text-xs border-2 border-black rounded-md shadow-sm transform -rotate-1 relative z-20 self-start max-w-[90%] uppercase tracking-wide">
                  {panel.narration}
                </div>

                {/* Graphic/Visual Sound Effect Overlay */}
                <div className="absolute right-6 top-16 select-none pointer-events-none z-10 transform rotate-12 transition-transform group-hover:scale-110">
                  <span className="font-black text-4xl md:text-5xl text-topper-amber stroke-black stroke-2 drop-shadow-[2px_2px_0px_#000] tracking-tighter uppercase italic block">
                    {actionText}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block text-center -mt-1">
                    [{panel.visual_intensity}]
                  </span>
                </div>

                {/* Center / Content: Scene visual description */}
                <div className="my-6 border-l-2 border-zinc-700 pl-3 italic text-xs text-zinc-400 relative z-10">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block mb-1">
                    Scene Detail
                  </span>
                  {panel.scene_description}
                </div>

                {/* Bottom dialog section */}
                <div className="flex flex-col gap-3 relative z-10 mt-auto">
                  {panel.dialogues.map((dlg, dIdx) => {
                    const isEven = dIdx % 2 === 0
                    return (
                      <div 
                        key={dIdx} 
                        className={`flex flex-col max-w-[85%] ${isEven ? 'self-start items-start' : 'self-end items-end'}`}
                      >
                        {/* Speaker alias tag */}
                        <span className="text-[10px] font-black text-topper-amber uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          {dlg.character}
                        </span>
                        {/* Speech Bubble Container */}
                        <div 
                          className={`p-3 rounded-2xl border-2 border-black font-bold text-xs text-black shadow-sm ${
                            isEven 
                              ? 'bg-white rounded-tl-none transform rotate-0.5' 
                              : 'bg-zinc-200 rounded-tr-none transform -rotate-0.5'
                          }`}
                        >
                          <p>{dlg.line}</p>
                        </div>
                      </div>
                    )
                  })}
                  {panel.dialogues.length === 0 && (
                    <div className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 uppercase">
                      <BookOpen className="w-3.5 h-3.5" />
                      Concept Module Active
                    </div>
                  )}
                </div>

                {/* Panel number footer label */}
                <div className="absolute right-4 bottom-2 bg-black text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5 font-bold text-[9px] uppercase tracking-wider z-20">
                  PANEL {panel.panel_number}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
