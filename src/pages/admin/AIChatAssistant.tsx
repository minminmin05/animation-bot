import React, { useState, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { askAI, getChatHistory } from '../../services/embedding/embeddingService'
import { LunaAssistant } from '../../components/luna-assistant/LunaAssistant'
import { generateSpeech } from '../../services/api/ttsService'
import { useLipSync } from '../../hooks/useLipSync'
import { useAuth } from '../../context/AuthContext'
import { type LunaState } from '../../components/luna-assistant/lunaConfig'

// Map old emotion names to Luna state names
const emotionToLunaState: Record<string, LunaState> = {
  'neutral': 'idle',
  'positive': 'idle',
  'warning': 'confused',
  'informative': 'talking',
  'happy': 'reaction',
  'concerned': 'confused',
  'helpful': 'talking',
}

const emotionToReaction: Record<string, string> = {
  'happy': 'greeting',
  'positive': 'greeting',
  'success': 'success',
}

const AIChatAssistant = () => {
  const { user, userRole } = useAuth()
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      type: 'ai',
      text: 'สวัสดีค่ะ/ครับ! ผมคือผู้ช่วย AI ของโรงเรียน มีอะไรให้ช่วยไหมคะ/ครับ?'
    }
  ])
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('ai_chat_session_id'))
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [emotion, setEmotion] = useState<string>('positive')
  const [lunaState, setLunaState] = useState<LunaState>('idle')
  const [reaction, setReaction] = useState<string | undefined>()

  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const mouthOpen = useLipSync(audioEl)

  // Reset Luna state when audio ends
  useEffect(() => {
    if (!audioEl) return;

    const handleEnded = () => {
      setLunaState('idle');
    };

    audioEl.addEventListener('ended', handleEnded);
    return () => {
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [audioEl]);

  // Load chat history
  useEffect(() => {
    if (sessionId && user?.id) {
      console.log(`[AIChat] Fetching history for session: ${sessionId}`);
      getChatHistory(sessionId, user.id)
        .then(data => {
          if (data.history && data.history.length > 0) {
            console.log(`[AIChat] Restored ${data.history.length} messages from session`);
            const loadedMessages = data.history.map((msg: any) => ({
              id: msg.id,
              type: msg.role === 'user' ? 'user' : 'ai',
              text: msg.content
            })).reverse();
            setMessages(loadedMessages);
          }
        })
        .catch(err => {
          console.error('[AIChat] Failed to fetch history:', err);
          localStorage.removeItem('ai_chat_session_id');
          setSessionId(null);
        });
    }
  }, [sessionId, user?.id]);

  const speak = async (text: string, currentEmotion: string) => {
    try {
      console.log(`[AIChat] TTS start for: "${text.substring(0, 30)}..."`);
      setTtsLoading(true)

      const audioUrl = await generateSpeech(text, currentEmotion)
      console.log('[AIChat] TTS finish. Received audio URL:', audioUrl);

      if (audioEl) {
        // Clean up previous URL if any
        const prevUrl = audioEl.src;
        if (prevUrl && prevUrl.startsWith('blob:')) {
          URL.revokeObjectURL(prevUrl);
        }

        audioEl.src = audioUrl;

        // Wait for metadata to ensure duration is available
        const onMetadata = () => {
          audioEl.removeEventListener('loadedmetadata', onMetadata);

          setLunaState('talking')
          
          console.log('[AIChat] Audio play start');
          console.log('[AIChat] Lip-sync start');
          const playPromise = audioEl.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('[AIChat] Audio play / lip-sync failure:', error);
              setLunaState('idle')
            });
          }
        };

        audioEl.addEventListener('loadedmetadata', onMetadata);
        audioEl.load();
      }
    } catch (error) {
      console.error('[AIChat] TTS failure:', error)
      setLunaState('idle')
    } finally {
      setTtsLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    console.log('[AIChat] User sent message:', input);

    if (audioEl) {
      audioEl.load();
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setEmotion('positive')
    setLunaState('listening')

    try {
      console.log('[AIChat] Calling AI Service...');
      console.log('[AIChat] User context:', { userId: user?.id, userRole, sessionId });
      const response: any = await askAI(input, { userId: user?.id, userRole, sessionId: sessionId || undefined })
      console.log('[AIChat] AI Response received:', response);

      if (response.sessionId && response.sessionId !== sessionId) {
        console.log(`[AIChat] Session created/updated: ${response.sessionId}`);
        setSessionId(response.sessionId);
        localStorage.setItem('ai_chat_session_id', response.sessionId);
      }

      console.log('[AIChat] Message render instantly');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: response.text
      }]);

      setEmotion(response.emotion)

      // Map emotion to Luna state
      const mappedReaction = emotionToReaction[response.emotion]

      setReaction(mappedReaction)
      
      // Run TTS asynchronously without awaiting
      speak(response.text, response.emotion).catch(err => {
        console.error('[AIChat] Background TTS failure:', err);
      });

    } catch (error) {
      console.error('[AIChat] AI Error:', error)
      setEmotion('warning')
      setReaction('apology')
      setLunaState('reaction')
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'
      }])
      setLunaState('idle')
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

        {/* Luna Avatar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={lunaState}
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            <LunaAssistant
              state={lunaState}
              reaction={reaction as any}
              quality="high"
              size={280}
              mouthOpen={mouthOpen}
            />
          </motion.div>
        </AnimatePresence>

        {/* Hidden Audio Element with Callback Ref */}
        <audio ref={(el) => setAudioEl(el)} className="hidden" />

        {/* Status Text */}
        <div className="relative z-10 text-center mt-4">
          <h2 className="text-xl font-bold text-navy flex items-center justify-center gap-2">
            AI Assistant <Sparkles className="w-5 h-5 text-yellow-500" />
          </h2>
          <p className="text-sm text-text-secondary mt-2 h-6">
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> กำลังคิด...
              </span>
            ) : ttsLoading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-accent" /> กำลังเตรียมเสียง...
              </span>
            ) : (
              'พร้อมตอบทุกคำถามเกี่ยวกับโรงเรียน'
            )}
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
                  : 'bg-cream text-navy rounded-tl-sm border border-cream-dark shadow-sm'
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
            <div className="flex gap-3 justify-start animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="bg-cream rounded-2xl rounded-tl-sm p-4 border border-cream-dark">
                <div className="flex gap-1.5 py-1">
                  <span className="w-2 h-2 bg-accent/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-accent/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" />
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
              placeholder={"ถามคำถาม..."}
              disabled={loading}
              className="w-full bg-cream/50 border border-cream-dark rounded-full py-3 pl-6 pr-14 text-sm focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 bg-accent hover:bg-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full shadow-sm transition-all flex items-center justify-center active:scale-95"
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

