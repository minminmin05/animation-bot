import React, { useState, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { askAI } from '../../services/embedding/embeddingService'
import EmotionCharacter from '../../animation-showcase/EmotionCharacter'
import { generateSpeech } from '../../services/api/ttsService'
import { useLipSync } from '../../hooks/useLipSync'
import { useAuth } from '../../context/AuthContext'

// Map old emotion names to new state names
const emotionMap: Record<string, string> = {
  'neutral': 'neutral',
  'happy': 'positive',
  'concerned': 'warning',
  'helpful': 'informative'
}

const AIChatAssistant = () => {
  const { user, userRole } = useAuth()
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'สวัสดีค่ะ/ครับ! ผมคือผู้ช่วย AI ของโรงเรียน มีอะไรให้ช่วยไหมคะ/ครับ?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [emotion, setEmotion] = useState<string>('positive')
  
  // States for synchronized typing
  const [typingText, setTypingText] = useState('')
  const [fullResponseText, setFullResponseText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const mouthOpen = useLipSync(audioEl)

  // Sync typing with audio time using requestAnimationFrame for smoothness
  useEffect(() => {
    if (!audioEl || !isTyping || !fullResponseText) return;

    let rafId: number;

    const updateTyping = () => {
      if (audioEl.duration > 0) {
        const progress = audioEl.currentTime / audioEl.duration;
        // Calculate characters based on progress
        const charCount = Math.ceil(progress * fullResponseText.length);
        
        // Only update if character count has changed to avoid unnecessary renders
        setTypingText(fullResponseText.substring(0, Math.max(1, charCount)));
      }
      
      if (isTyping) {
        rafId = requestAnimationFrame(updateTyping);
      }
    };

    const handleEnded = () => {
      cancelAnimationFrame(rafId);
      // Ensure full text is shown at the end
      setTypingText(fullResponseText);
      
      // Move typing text to messages list
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        text: fullResponseText
      }]);
      
      // Reset typing states
      setIsTyping(false);
      setTypingText('');
      setFullResponseText('');
    };

    rafId = requestAnimationFrame(updateTyping);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      cancelAnimationFrame(rafId);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, [audioEl, isTyping, fullResponseText]);

  const speak = async (text: string, currentEmotion: string) => {
    try {
      console.log(`[AIChat] Starting TTS for: "${text.substring(0, 30)}..."`);
      setTtsLoading(true)
      
      const audioUrl = await generateSpeech(text, currentEmotion)
      console.log('[AIChat] Received audio URL:', audioUrl);

      if (audioEl) {
        // Clean up previous URL if any
        const prevUrl = audioEl.src;
        if (prevUrl && prevUrl.startsWith('blob:')) {
          URL.revokeObjectURL(prevUrl);
        }

        audioEl.src = audioUrl;
        
        // Wait for metadata to ensure duration is available
        const onMetadata = () => {
          console.log(`[AIChat] Audio metadata loaded. Duration: ${audioEl.duration}s`);
          audioEl.removeEventListener('loadedmetadata', onMetadata);
          
          // Start typing and playing simultaneously
          setIsTyping(true);
          setFullResponseText(text);
          setTypingText('');
          
          const playPromise = audioEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('[AIChat] Audio play failed:', error);
              // Fallback: Just show text if audio fails
              setIsTyping(false);
              setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text }]);
            });
          }
        };

        audioEl.addEventListener('loadedmetadata', onMetadata);
        audioEl.load();
      }
    } catch (error) {
      console.error('[AIChat] TTS Error:', error)
      // Fallback: Show text even if TTS fails
      setMessages(prev => [...prev, { id: Date.now(), type: 'ai', text }]);
    } finally {
      setTtsLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || isTyping) return

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

    try {
      console.log('[AIChat] Calling AI Service...');
      console.log('[AIChat] User context:', { userId: user?.id, userRole });
      const response = await askAI(input, { userId: user?.id, userRole })
      console.log('[AIChat] AI Response received:', response);

      const mappedEmotion = emotionMap[response.emotion] || 'positive'
      setEmotion(mappedEmotion)

      // Start TTS - the typing effect will start once audio is ready
      await speak(response.text, mappedEmotion)
    } catch (error) {
      console.error('[AIChat] AI Error:', error)
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

        {/* Avatar with Emotion Character */}
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
            ) : isTyping ? (
              <span className="text-accent font-medium animate-pulse flex items-center gap-2 justify-center">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                กำลังพูด...
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

          {/* Typing Animation Area - Fixed and Synchronized */}
          {isTyping && typingText && (
            <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="max-w-[80%] bg-cream text-navy rounded-2xl rounded-tl-sm p-4 border border-cream-dark shadow-sm ring-1 ring-accent/5">
                <p className="text-sm leading-relaxed whitespace-pre-line min-h-[1.25rem]">
                  {typingText}
                  <span className="inline-block w-2 h-4 bg-accent/60 ml-1 translate-y-0.5 animate-pulse" />
                </p>
              </div>
            </div>
          )}

          {loading && !isTyping && (
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
              placeholder={isTyping ? "รอให้ AI พูดจบก่อน..." : "ถามคำถาม..."}
              disabled={loading || isTyping}
              className="w-full bg-cream/50 border border-cream-dark rounded-full py-3 pl-6 pr-14 text-sm focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || isTyping}
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

export default AIChatAssistant;
