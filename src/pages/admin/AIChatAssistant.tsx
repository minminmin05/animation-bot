import React, { useState, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { askAI, getChatHistory, API_BASE } from '../../services/embedding/embeddingService'
import { LunaAssistant } from '../../components/luna-assistant/LunaAssistant'
import { generateSpeech } from '../../services/api/ttsService'
import { useLipSync } from '../../hooks/useLipSync'
import { useAuth } from '../../context/AuthContext'
import { type LunaState } from '../../components/luna-assistant/lunaConfig'
import { supabase } from '../../config/supabaseClient'

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number | string } | null>(null)

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

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Load chat history
  useEffect(() => {
    if (sessionId && user?.id) {
      console.log(`[AIChat] Fetching history for session: ${sessionId}`);
      
      const fetchHistory = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const data = await getChatHistory(sessionId, user.id, token);
          
          if (data.history && data.history.length > 0) {
            console.log(`[AIChat] Restored ${data.history.length} messages from session`);
            const loadedMessages = data.history.map((msg: any) => ({
              id: msg.id,
              type: msg.role === 'user' ? 'user' : 'ai',
              text: msg.content
            })).reverse();
            setMessages(loadedMessages);
          }
        } catch (err) {
          console.error('[AIChat] Failed to fetch history:', err);
          localStorage.removeItem('ai_chat_session_id');
          setSessionId(null);
        }
      };

      fetchHistory();
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

  const handleDeleteMessage = async (messageId: number | string) => {
    if (!messageId || String(messageId).includes('undefined')) {
      console.error('[AIChat] Cannot delete message: ID is missing or malformed', messageId);
      return;
    }

    const prevMessages = [...messages]
    setMessages(msgs => msgs.filter(m => m.id !== messageId))
    setContextMenu(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      console.log(`[AIChat] Deleting message ${messageId} from ${API_BASE}`)
      const res = await fetch(`${API_BASE}/api/memory/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
    } catch (error) {
      console.error('[AIChat] Failed to delete message:', error)
      setMessages(prevMessages)
      alert('ไม่สามารถลบข้อความได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  const handleClearChat = async () => {
    if (!sessionId) {
      setMessages([])
      return
    }

    if (!window.confirm('คุณต้องการลบประวัติการสนทนาทั้งหมดในเซสชันนี้หรือไม่? (การลบนี้จะไม่สามารถกู้คืนได้)')) {
      return
    }

    console.log(`[AIChat] Clearing session ${sessionId} via ${API_BASE}`)
    const prevMessages = [...messages]
    const oldSessionId = sessionId
    
    setMessages([])
    setSessionId(null)
    localStorage.removeItem('ai_chat_session_id')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${API_BASE}/api/memory/sessions/${oldSessionId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      if (!res.ok) throw new Error(`Failed to clear session: ${res.status}`)
    } catch (error) {
      console.error('[AIChat] Failed to clear session:', error)
      setMessages(prevMessages)
      setSessionId(oldSessionId)
      localStorage.setItem('ai_chat_session_id', oldSessionId)
      alert('ไม่สามารถลบเซสชันได้ กรุณาลองใหม่อีกครั้ง')
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
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      console.log('[AIChat] User context:', { userId: user?.id, userRole, sessionId });
      const response: any = await askAI(input, { 
        userId: user?.id, 
        userRole, 
        sessionId: sessionId || undefined,
        token
      })
      console.log('[AIChat] AI Response received:', response);

      if (response.sessionId && response.sessionId !== sessionId) {
        console.log(`[AIChat] Session created/updated: ${response.sessionId}`);
        setSessionId(response.sessionId);
        localStorage.setItem('ai_chat_session_id', response.sessionId);
      }

      console.log('[AIChat] Message render instantly');
      const aiMessageId = response.messageId || `ai-${Date.now()}`;
      const userMsgId = response.userMessageId;

      setMessages(prev => {
        // Update the last user message with its real database ID if available
        const updated = [...prev];
        if (userMsgId) {
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].type === 'user' && typeof updated[i].id === 'number') {
              updated[i] = { ...updated[i], id: userMsgId };
              break;
            }
          }
        }
        
        // Add AI response
        return [...updated, {
          id: aiMessageId,
          type: 'ai',
          text: response.text
        }];
      });

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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-cream/30 dark:bg-gray-800/50 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-navy">Knowledge Base Chat</h3>
            <p className="text-xs text-text-muted">ถามเรื่องอะไรก็ได้เกี่ยวกับข้อมูลโรงเรียน</p>
          </div>
          <button 
            onClick={handleClearChat}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-full transition-colors"
            title="ลบประวัติการสนทนาทั้งหมด"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'} group`}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, messageId: msg.id });
              }}
            >

              {msg.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
              )}

              <div className={`max-w-[80%] rounded-2xl p-4 cursor-context-menu relative ${
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

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleDeleteMessage(contextMenu.messageId)}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Message
              </button>
              <button
                onClick={() => setContextMenu(null)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AIChatAssistant

