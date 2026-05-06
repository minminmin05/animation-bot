import React, { useState } from 'react'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { askAI } from '../../services/embedding/embeddingService'
import EmotionCharacter from '../../animation-showcase/EmotionCharacter'

// Map old emotion names to new state names
const emotionMap: Record<string, string> = {
  'neutral': 'neutral',
  'happy': 'positive',
  'concerned': 'warning',
  'helpful': 'informative'
}

const AIChatAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'สวัสดีค่ะ/ครับ! ผมคือผู้ช่วย AI ของโรงเรียน มีอะไรให้ช่วยไหมคะ/ครับ?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // Default to "positive" - falls back to "positive" if emotion is undefined/null
  const [emotion, setEmotion] = useState<string>('positive')

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    // Show "positive" state while waiting for response
    setEmotion('positive')

    try {
      const response = await askAI(input)
      // Map the response emotion to our state system, fallback to "positive"
      const mappedEmotion = emotionMap[response.emotion] || 'positive'
      setEmotion(mappedEmotion)

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: response.text
      }])
    } catch (error) {
      console.error('AI Error:', error)
      // Show "warning" state on error
      setEmotion('warning')
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto gap-6 lg:flex-row">

      {/* Animation/Avatar Area */}
      <div className="w-full lg:w-1/3 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-sm">

        {/* Animated Background Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Avatar with Emotion Character - Default to "positive" */}
        <AnimatePresence mode="wait">
          <motion.div
            key={emotion}
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            <EmotionCharacter
              state={emotion || 'positive'}
              intensity={0.6}
              size="xl"
              showLabel={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Status Text */}
        <div className="relative z-10 text-center mt-4">
          <h2 className="text-xl font-bold text-navy flex items-center justify-center gap-2">
            AI Assistant <Sparkles className="w-5 h-5 text-yellow-500" />
          </h2>
          <p className="text-sm text-text-secondary mt-2">
            {loading ? 'กำลังคิด...' : 'พร้อมตอบทุกคำถามเกี่ยวกับโรงเรียน'}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-full lg:w-2/3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">

        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-cream/30 dark:bg-gray-800/50">
          <h3 className="font-semibold text-navy">Knowledge Base Chat</h3>
          <p className="text-xs text-text-muted">ถามเรื่องอะไรก็ได้เกี่ยวกับข้อมูลโรงเรียน</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
              )}

              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.type === 'user'
                  ? 'bg-navy text-white rounded-tr-sm'
                  : 'bg-cream text-navy rounded-tl-sm border border-cream-dark'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
              </div>

              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-navy" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
              </div>
              <div className="bg-cream rounded-2xl rounded-tl-sm p-4 border border-cream-dark">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ถามคำถาม..."
              disabled={loading}
              className="w-full bg-cream border border-cream-dark rounded-full py-3 pl-6 pr-14 text-sm focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 bg-accent hover:bg-accent-hover disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AIChatAssistant
