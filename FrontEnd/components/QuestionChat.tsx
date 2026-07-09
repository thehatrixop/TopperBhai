'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'

interface Question {
  id: number
  type?: 'mcq' | 'msq' | 'fitb' | 'assertion_reason' | 'matching'
  topic: string
  question: string
  options?: {
    A: string
    B: string
    C: string
    D: string
  }
  correct_answer: string
  explanation: string
  assertion?: string
  reason?: string
  list_i?: Record<string, string>
  list_ii?: Record<string, string>
}

interface QuestionChatProps {
  question: Question
  selectedAnswer: string
}

export default function QuestionChat({ question, selectedAnswer }: QuestionChatProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Seed the initial tutor message
  useEffect(() => {
    const isMsq = question.type === 'msq'
    const isFitb = question.type === 'fitb'
    
    let tutorGreeting = ''
    if (isFitb) {
      tutorGreeting = `Hi there! I am your TopperBhai AI Tutor. I notice you entered **"${selectedAnswer}"** for this fill-in-the-blank question, while the correct answer is **"${question.correct_answer}"**.\n\nLet's review this together. Where did you run into difficulty, or would you like me to walk you through the correct conceptual logic step-by-step?`
    } else if (isMsq) {
      tutorGreeting = `Hi there! I am your TopperBhai AI Tutor. I notice you chose option(s) **${selectedAnswer}** for this question, while the correct answer is **${question.correct_answer}**.\n\nLet's review this together. Where did you run into difficulty, or would you like me to walk you through the correct conceptual logic step-by-step?`
    } else {
      tutorGreeting = `Hi there! I am your TopperBhai AI Tutor. I notice you chose option **${selectedAnswer}** for this question, while the correct answer is **${question.correct_answer}**.\n\nLet's review this together. Where did you run into difficulty, or would you like me to walk you through the correct logic step-by-step?`
    }

    setMessages([
      {
        role: 'assistant',
        content: tutorGreeting
      }
    ])
  }, [question, selectedAnswer])

  // Scroll to bottom on new message or loading change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    
    const updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...messages,
      { role: 'user', content: userMessage }
    ]
    setMessages(updatedHistory)
    setLoading(true)

    try {
      // API call to the backend
      const response = await fetch('http://localhost:8000/api/v1/chat/analyze-mistake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question,
          options: question.options,
          correct_answer: question.correct_answer,
          selected_answer: selectedAnswer,
          explanation: question.explanation,
          message: userMessage,
          history: updatedHistory.slice(1).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          type: question.type,
          assertion: question.assertion,
          reason: question.reason,
          list_i: question.list_i,
          list_ii: question.list_ii,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get answer from tutor')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Oops! I encountered an issue connecting to the AI Tutor server. Please make sure the backend is running and try again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  function formatMessageContent(content: string) {
    return content.split('\n').map((line, i) => {
      let key = i
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ')
      let cleanLine = line
      if (isBullet) {
        cleanLine = line.trim().substring(2)
      }
      
      const parts = cleanLine.split(/\*\*(.*?)\*\*/g)
      const renderedLine = parts.map((part, index) => {
        // Since we split by \*\*(.*?)\*\*, odd indexes are content inside the bold tags
        if (index % 2 === 1) {
          return <strong key={index} className="font-extrabold text-topper-amber">{part}</strong>
        }
        return part
      })

      if (isBullet) {
        return (
          <li key={key} className="ml-4 list-disc mb-1 leading-relaxed text-sm">
            {renderedLine}
          </li>
        )
      }
      
      return (
        <p key={key} className="mb-2 leading-relaxed text-sm min-h-[1em]">
          {renderedLine}
        </p>
      )
    })
  }

  return (
    <div className="mt-4 border-2 border-topper-graphite rounded-lg bg-topper-black/60 overflow-hidden flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-topper-graphite/40 border-b border-topper-graphite flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-topper-amber/10 border border-topper-amber/30 flex items-center justify-center text-topper-amber">
            <Sparkles className="w-4 h-4 animate-pulse-glow" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-topper-off-white">TopperBhai AI Tutor</h4>
            <p className="text-[10px] text-topper-graphite">Personal Mistake Analyzer</p>
          </div>
        </div>
        <span className="text-[10px] bg-topper-amber/10 border border-topper-amber/30 text-topper-amber px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
          AI Help
        </span>
      </div>

      {/* Messages Feed */}
      <div className="p-4 max-h-[300px] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-topper-graphite scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
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
                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-topper-amber text-topper-black flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div
                  className={`max-w-[85%] p-3 rounded-lg text-topper-off-white border ${
                    isUser
                      ? 'bg-topper-graphite/50 border-topper-graphite'
                      : 'bg-topper-charcoal/80 border-topper-graphite/40'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{formatMessageContent(msg.content)}</div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 flex-shrink-0 rounded-full bg-topper-graphite text-topper-off-white border border-topper-graphite flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-7 h-7 flex-shrink-0 rounded-full bg-topper-amber text-topper-black flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-topper-charcoal/80 border border-topper-graphite/40 max-w-[85%] p-3 rounded-lg flex items-center gap-2 text-topper-graphite text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-topper-amber" />
              Thinking...
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-topper-graphite bg-topper-charcoal/40 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Ask AI Tutor for explanation or clarity..."
          className="flex-1 bg-topper-black border border-topper-graphite text-topper-off-white text-xs px-3 py-2.5 rounded focus:outline-none focus:border-topper-amber/60 placeholder-topper-graphite transition-colors"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded bg-topper-amber text-topper-black disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center font-bold"
        >
          <Send className="w-3.5 h-3.5" />
        </motion.button>
      </form>
    </div>
  )
}
