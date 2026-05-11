/**
 * System Settings Page
 * Includes Animation Settings & Preview section & Embedding Settings
 */

import { useState, useEffect, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Bell, Palette, Shield, Database, Brain, AlertTriangle, RefreshCw, Check, Info, Lock, RotateCcw, Save, Volume2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { centralSupabase as supabase } from '@/integrations/supabase/central-client'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// TTS provider options
const TTS_PROVIDERS = {
  botnoi: {
    id: 'botnoi',
    name: 'Botnoi Voice',
    description: 'เสียงภาษาไทยคุณภาพสูง พร้อมรองรับอารมณ์',
    thaiDescription: 'ระบบเสียงสังเคราะห์ภาษาไทยที่มีความเป็นธรรมชาติสูง รองรับการเลือกเสียงตามอารมณ์ (Happy, Concerned, etc.)',
    badge: 'แนะนำ'
  },
  edge: {
    id: 'edge',
    name: 'Edge-TTS (Microsoft)',
    description: 'เสียงภาษาไทยฟรีจาก Microsoft Edge',
    thaiDescription: 'ระบบเสียงสังเคราะห์จาก Microsoft Edge รองรับเสียงภาษาไทยชายและหญิง ใช้งานได้ฟรีไม่ต้องมี API Key',
    badge: 'ฟรี'
  },
  google: {
    id: 'google',
    name: 'Google Cloud TTS',
    description: 'Standard Google Text-to-Speech',
    thaiDescription: 'ระบบเสียงจาก Google Cloud (Coming Soon)',
    badge: 'เสถียร'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI TTS',
    description: 'Natural sounding voices from OpenAI',
    thaiDescription: 'เสียงจาก OpenAI ที่มีความเป็นธรรมชาติสูงมาก (Coming Soon)',
    badge: 'พรีเมียม'
  }
}

// Lazy load animation components to prevent white screen on load
const EmotionCharacter = lazy(() => import('../../animation-showcase/EmotionCharacter.jsx'))
const AnimationGallery = lazy(() => import('../../animation-showcase/AnimationGallery.jsx'))
const AnimationPreview = lazy(() => import('../../animation-showcase/AnimationPreview.jsx'))

// Import emotion config directly (it's a small config file)
import { emotionStates } from '../../animation-showcase/emotionConfig'

// Embedding model options
const EMBEDDING_MODELS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    speed: 'fast',
    cost: 'paid',
    description: 'ใช้งานได้ดี รวดเร็ว แม่นยำสูง แต่ต้องมี API Key',
    thaiDescription: 'โมเดลจาก OpenAI มีความแม่นยำสูง รองรับภาษาไทยดี',
    badge: 'แนะนำ'
  },
  local: {
    id: 'local',
    name: 'Transformers (Multilingual)',
    model: 'paraphrase-multilingual-MiniLM-L12-v2',
    dimensions: 384,
    speed: 'fast',
    cost: 'free',
    description: 'ฟรี ทำงานบนเครื่อง รองรับภาษาไทยและหลายภาษา',
    thaiDescription: 'โมเดลฟรีรองรับภาษาไทย ทำงานบนเครื่องเอง ไม่ต้องเชื่อมต่ออินเทอร์เน็ต',
    badge: 'รองรับไทย'
  }
}

const SystemSettings = () => {
  console.log('[SystemSettings] Component mounting...')

  const [activeTab, setActiveTab] = useState('general')
  const [isReady, setIsReady] = useState(true) // Component is ready by default

  // Embedding settings state
  const [embeddingProvider, setEmbeddingProvider] = useState('local')
  const [embeddingLoading, setEmbeddingLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingProvider, setPendingProvider] = useState(null)

  // Access policies state
  const [policies, setPolicies] = useState([])
  const [policiesLoading, setPoliciesLoading] = useState(true)
  const [savingPolicy, setSavingPolicy] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // TTS settings state
  const [ttsProvider, setTtsProvider] = useState('botnoi')
  const [ttsLoading, setTtsLoading] = useState(false)
  const [savingTts, setSavingTts] = useState(false)
  const [ttsTestText, setTtsTestText] = useState('สวัสดีครับ ยินดีต้อนรับสู่โรงเรียนลุมายด์')
  const [ttsTesting, setTtsTesting] = useState(false)
  const [ttsTestResult, setTtsTestResult] = useState(null)
  const [ttsHealth, setTtsHealth] = useState(null)
  const [checkingHealth, setCheckingHealth] = useState(false)

  // Embedding test state
  const [testTexts, setTestTexts] = useState([
    'นักเรียนทุกคนต้องสวมเครื่องแบบนักเรียนเพื่อความเป็นระเบียบเรียบร้อย',
    'โรงเรียนขอให้นักเรียนสวมชุดนักเรียนในทุกวันที่มีการเรียนการสอน',
    'วันนี้ในโรงอาหารมีบริการอาหารกลางวันเป็นข้าวมันไก่พร้อมแกงจึนจัดซุก'
  ])
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState(null)

  // Fetch current embedding settings
  useEffect(() => {
    fetchEmbeddingSettings()
  }, [])

  const fetchEmbeddingSettings = async () => {
    try {
      setEmbeddingLoading(true)
      console.log('[Frontend] Fetching embedding settings...')

      const response = await fetch(`${API_BASE}/api/settings`)
      console.log('[Frontend] Settings response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('[Frontend] Failed to fetch settings:', errorData)
        throw new Error(errorData.message || 'Failed to fetch settings')
      }

      const data = await response.json()
      console.log('[Frontend] Settings data:', data)

      const provider = data.embedding?.provider || 'openai'
      setEmbeddingProvider(provider)
      console.log('[Frontend] Current provider set to:', provider)
    } catch (error) {
      console.error('[Frontend] Failed to fetch embedding settings:', error)
      toast.error(`ไม่สามารถดึงข้อมูลการตั้งค่าได้: ${error.message}`)
    } finally {
      setEmbeddingLoading(false)
    }
  }

  // Fetch current TTS settings
  useEffect(() => {
    fetchTtsSettings()
  }, [])

  const fetchTtsSettings = async () => {
    try {
      setTtsLoading(true)
      const response = await fetch(`${API_BASE}/api/settings`)
      if (response.ok) {
        const data = await response.json()
        setTtsProvider(data.tts?.provider || 'botnoi')
      }
    } catch (error) {
      console.error('[Frontend] Failed to fetch TTS settings:', error)
    } finally {
      setTtsLoading(false)
    }
  }

  const handleTtsProviderChange = async (providerId) => {
    if (providerId === ttsProvider) return

    try {
      setSavingTts(true)

      // Try to get auth token, but don't require it for TTS changes
      let headers = { 'Content-Type': 'application/json' }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`${API_BASE}/api/settings/tts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider: providerId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        if (response.status === 401) {
          toast.error('กรุณาเข้าสู่ระบบใหม่')
          return
        }
        if (response.status === 403) {
          toast.error('คุณไม่มีสิทธิ์เข้าถึงการตั้งค่านี้ (Admin เท่านั้น)')
          return
        }
        throw new Error(errorData.error || errorData.message || 'Failed to update TTS provider')
      }

      setTtsProvider(providerId)
      toast.success(`เปลี่ยนโมเดลเสียงเป็น ${TTS_PROVIDERS[providerId].name} สำเร็จ`)
    } catch (error) {
      console.error('[Frontend] Error updating TTS provider:', error)
      toast.error(`ไม่สามารถเปลี่ยนโมเดลเสียงได้: ${error.message}`)
    } finally {
      setSavingTts(false)
    }
  }

  const runTtsTest = async () => {
    if (!ttsTestText.trim()) {
      toast.error('กรุณากรอกข้อความทดสอบ')
      return
    }

    setTtsTesting(true)
    setTtsTestResult(null)

    try {
      const startTime = Date.now()
      const response = await fetch(`${API_BASE}/api/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsTestText, emotion: 'neutral' })
      })
      const latency = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to generate speech')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      setTtsTestResult({
        success: true,
        audioUrl,
        latency,
        size: audioBlob.size,
        provider: TTS_PROVIDERS[ttsProvider]?.name || ttsProvider
      })

      toast.success('ทดสอบเสียงสำเร็จ')
    } catch (error) {
      console.error('TTS test error:', error)
      setTtsTestResult({
        success: false,
        error: error.message
      })
      toast.error(`ทดสอบเสียงล้มเหลว: ${error.message}`)
    } finally {
      setTtsTesting(false)
    }
  }

  const checkTtsHealth = async () => {
    setCheckingHealth(true)
    setTtsHealth(null)

    try {
      const response = await fetch(`${API_BASE}/api/tts/health`)

      if (!response.ok) {
        throw new Error('Failed to check provider health')
      }

      const data = await response.json()
      setTtsHealth(data)
    } catch (error) {
      console.error('Health check error:', error)
      toast.error('ไม่สามารถตรวจสอบสถานะ Provider ได้')
    } finally {
      setCheckingHealth(false)
    }
  }

  const resetTtsHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/tts/health/reset`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to reset provider health')
      }

      toast.success('รีเซ็ตสถานะ Provider สำเร็จ')
      checkTtsHealth()
    } catch (error) {
      console.error('Reset error:', error)
      toast.error('ไม่สามารถรีเซ็ตสถานะ Provider ได้')
    }
  }

  const handleProviderChange = (providerId) => {
    if (providerId !== embeddingProvider) {
      setPendingProvider(providerId)
      setShowConfirmDialog(true)
    }
  }

  const confirmProviderChange = async () => {
    setShowConfirmDialog(false)

    try {
      setRegenerating(true)

      console.log('[Frontend] Updating embedding provider to:', pendingProvider)

      // Update provider
      const updateResponse = await fetch(`${API_BASE}/api/settings/embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: pendingProvider })
      })

      console.log('[Frontend] Update response status:', updateResponse.status)

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ message: 'Unknown error' }))
        console.error('[Frontend] Update failed:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to update provider')
      }

      const updateData = await updateResponse.json()
      console.log('[Frontend] Update response:', updateData)

      // Regenerate embeddings
      console.log('[Frontend] Starting regeneration...')
      const regenResponse = await fetch(`${API_BASE}/api/embeddings/regenerate`, {
        method: 'POST'
      })

      console.log('[Frontend] Regenerate response status:', regenResponse.status)

      if (!regenResponse.ok) {
        const errorData = await regenResponse.json().catch(() => ({ message: 'Unknown error' }))
        console.error('[Frontend] Regenerate failed:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to regenerate embeddings')
      }

      const regenData = await regenResponse.json()
      console.log('[Frontend] Regenerate response:', regenData)

      // Update local state with the confirmed provider from server
      setEmbeddingProvider(pendingProvider)

      toast.success(`เปลี่ยนเป็น ${EMBEDDING_MODELS[pendingProvider].name} และเริ่มสร้าง Embedding ใหม่แล้ว`)

      // Refresh settings after a short delay to confirm the change
      setTimeout(() => {
        fetchEmbeddingSettings()
      }, 1000)
    } catch (error) {
      console.error('[Frontend] Failed to change provider:', error)
      toast.error(`ไม่สามารถเปลี่ยนโมเดลได้: ${error.message}`)
    } finally {
      setRegenerating(false)
      setPendingProvider(null)
    }
  }

  const cancelProviderChange = () => {
    setShowConfirmDialog(false)
    setPendingProvider(null)
  }

  const runEmbeddingTest = async () => {
    setTesting(true)
    setTestResults(null)

    try {
      const response = await fetch(`${API_BASE}/api/embeddings/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: testTexts.filter(t => t.trim()) })
      })

      if (!response.ok) {
        throw new Error('Failed to test embeddings')
      }

      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Embedding test error:', error)
      toast.error(`ทดสอบ Embedding ล้มเหลว: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  // Access Policies Functions
  const fetchAccessPolicies = async () => {
    try {
      setPoliciesLoading(true)
      console.log('[Frontend] Fetching access policies...')

      // Get auth token from Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('[Frontend] No auth session found:', sessionError)
        toast.error('กรุณาเข้าสู่ระบบ')
        setPoliciesLoading(false)
        return
      }

      console.log('[Frontend] Session user:', session.user?.email)
      console.log('[Frontend] API_BASE:', API_BASE)

      const response = await fetch(`${API_BASE}/api/access-policies`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log('[Frontend] Response status:', response.status)
      const responseText = await response.text()
      console.log('[Frontend] Response body:', responseText)

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('กรุณาเข้าสู่ระบบใหม่')
          console.error('[Frontend] 401 Unauthorized - token invalid or expired')
          return
        }
        if (response.status === 403) {
          toast.error('คุณไม่มีสิทธิ์เข้าถึงการตั้งค่านี้')
          console.error('[Frontend] 403 Forbidden - user role is not admin')
          return
        }
        throw new Error(`Failed to fetch access policies: ${response.status}`)
      }

      const data = JSON.parse(responseText)
      console.log('[Frontend] Policies fetched:', data.policies?.length || 0)
      setPolicies((data.policies || []).map(p => ({ ...p, _changed: false })))
    } catch (error) {
      console.error('[Frontend] Error fetching policies:', error)
      toast.error('ไม่สามารถดึงข้อมูลนโยบายได้')
    } finally {
      setPoliciesLoading(false)
    }
  }

  const updatePolicy = async (policyId, updates) => {
    try {
      setSavingPolicy(policyId)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('กรุณาเข้าสู่ระบบใหม่')
        setSavingPolicy(null)
        return
      }

      const response = await fetch(`${API_BASE}/api/access-policies/${policyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update policy')
      }

      const data = await response.json()

      // Update local state
      setPolicies(prev => prev.map(p =>
        p.id === policyId
          ? { ...p, ...updates, _changed: false }
          : p
      ))

      toast.success('อัปเดตนโยบายเรียบร้อย')
      setHasChanges(false)
    } catch (error) {
      console.error('[Frontend] Error updating policy:', error)
      toast.error('ไม่สามารถอัปเดตนโยบายได้')
    } finally {
      setSavingPolicy(null)
    }
  }

  const handleScopeChange = (policyId, newScope) => {
    setPolicies(prev => prev.map(p =>
      p.id === policyId ? { ...p, scope: newScope, _changed: true } : p
    ))
    setHasChanges(true)
  }

  const handleEnabledToggle = (policyId, newEnabled) => {
    setPolicies(prev => prev.map(p =>
      p.id === policyId ? { ...p, enabled: newEnabled, _changed: true } : p
    ))
    setHasChanges(true)
  }

  const saveAllChanges = async () => {
    const changedPolicies = policies.filter(p => p._changed === true)

    for (const policy of changedPolicies) {
      await updatePolicy(policy.id, {
        scope: policy.scope,
        enabled: policy.enabled
      })
    }

    // Clear changed flags
    setPolicies(prev => prev.map(p => ({ ...p, _changed: false })))
  }

  const resetToDefaults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('กรุณาเข้าสู่ระบบใหม่')
        return
      }

      const response = await fetch(`${API_BASE}/api/access-policies/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to reset policies')
      }

      toast.success('รีเซ็ตนโยบายเรียบร้อย')
      await fetchAccessPolicies()
      setShowResetConfirm(false)
    } catch (error) {
      console.error('[Frontend] Error resetting policies:', error)
      toast.error('ไม่สามารถรีเซ็ตนโยบายได้')
    }
  }

  // Fetch access policies when access-control tab is active
  useEffect(() => {
    if (activeTab === 'access-control') {
      fetchAccessPolicies()
    }
  }, [activeTab])

  const tabs = [
    { id: 'general', label: 'ทั่วไป', icon: SettingsIcon },
    { id: 'embedding', label: 'Embedding', icon: Brain },
    { id: 'tts', label: 'เสียงสังเคราะห์ (TTS)', icon: Volume2 },
    { id: 'animation', label: 'แอนิเมชัน', icon: Palette },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
    { id: 'access-control', label: 'การควบคุมการเข้าถึง', icon: Lock },
    { id: 'security', label: 'ความปลอดภัย', icon: Shield },
    { id: 'data', label: 'ข้อมูล', icon: Database },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">
          ตั้งค่าระบบ
        </h1>
        <p className="text-text-secondary mt-1">
          จัดการการตั้งค่าและกำหนดค่าต่างๆ ของระบบ
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-navy text-white shadow-medium'
                  : 'bg-white text-text-secondary hover:bg-cream border border-cream-dark'
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'general' && (
          <div className="card">
            <div className="p-6 border-b border-cream-dark">
              <h2 className="text-lg font-display font-semibold text-navy">ตั้งค่าทั่วไป</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy mb-2">ชื่อโรงเรียน</label>
                <input
                  type="text"
                  defaultValue="Lumaid School"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-2">ภาษาเริ่มต้น</label>
                <select className="input-field">
                  <option>ไทย (Thai)</option>
                  <option>English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Timezone</label>
                <select className="input-field">
                  <option>Asia/Bangkok (GMT+7)</option>
                  <option>UTC</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'embedding' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="card">
              <div className="p-6 border-b border-cream-dark">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-navy" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-semibold text-navy">
                      ตั้งค่า Embedding Model
                    </h2>
                    <p className="text-sm text-text-muted">
                      เลือกโมเดลสำหรับสร้างเวกเตอร์ความคล้ายคลึงของข้อความ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="card bg-amber-50 border-amber-200">
              <div className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-900">⚠️ การเปลี่ยนโมเดลจะต้องสร้าง Embedding ใหม่ทั้งหมด</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    เวกเตอร์จากโมเดลต่างกันมีขนาดไม่เท่ากัน ไม่สามารถใช้ร่วมกันได้
                    เมื่อเปลี่ยนโมเดล ระบบจะสร้าง embedding ใหม่ทั้งหมดอัตโนมัติ
                  </p>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {embeddingLoading ? (
              <div className="card">
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-navy mx-auto mb-3 animate-spin" />
                  <p className="text-text-muted">กำลังโหลดข้อมูล...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Model Selection */}
                <div className="card">
                  <div className="p-6 border-b border-cream-dark">
                    <h3 className="text-base font-display font-semibold text-navy">
                      เลือกโมเดล Embedding
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {Object.values(EMBEDDING_MODELS).map((model) => (
                      <motion.button
                        key={model.id}
                        onClick={() => !regenerating && handleProviderChange(model.id)}
                        disabled={regenerating}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                          embeddingProvider === model.id
                            ? 'border-navy bg-navy/5'
                            : 'border-cream-dark hover:border-navy/30 hover:bg-cream/20'
                        } ${regenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        whileHover={!regenerating ? { scale: 1.01 } : {}}
                        whileTap={!regenerating ? { scale: 0.99 } : {}}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-navy">{model.name}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                model.cost === 'free' ? 'bg-sage/20 text-sage-dark' : 'bg-amber/20 text-amber-dark'
                              }`}>
                                {model.cost === 'free' ? 'ฟรี' : 'มีค่าใช้จ่าย'}
                              </span>
                            </div>
                            <p className="text-sm text-text-secondary mb-2">{model.thaiDescription}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <Info size={12} />
                                Model: {model.model}
                              </span>
                              <span className="flex items-center gap-1">
                                <Info size={12} />
                                Dimensions: {model.dimensions}
                              </span>
                              <span className="flex items-center gap-1">
                                <Info size={12} />
                                Speed: {model.speed === 'fast' ? 'เร็ว' : 'ปานกลาง'}
                              </span>
                            </div>
                          </div>
                          {embeddingProvider === model.id && (
                            <div className="w-6 h-6 bg-navy rounded-full flex items-center justify-center flex-shrink-0">
                              <Check size={14} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Current Status */}
                <div className="card">
                  <div className="p-6 border-b border-cream-dark">
                    <h3 className="text-base font-display font-semibold text-navy">
                      สถานะปัจจุบัน
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-cream/30 rounded-xl p-4">
                        <p className="text-sm text-text-muted mb-1">Provider</p>
                        <p className="font-semibold text-navy">
                          {EMBEDDING_MODELS[embeddingProvider]?.name || '-'}
                        </p>
                      </div>
                      <div className="bg-cream/30 rounded-xl p-4">
                        <p className="text-sm text-text-muted mb-1">Dimensions</p>
                        <p className="font-semibold text-navy">
                          {EMBEDDING_MODELS[embeddingProvider]?.dimensions || '-'}
                        </p>
                      </div>
                      <div className="bg-cream/30 rounded-xl p-4">
                        <p className="text-sm text-text-muted mb-1">Model</p>
                        <p className="font-semibold text-navy text-sm">
                          {EMBEDDING_MODELS[embeddingProvider]?.model || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Regenerate Button */}
                    <div className="mt-4 pt-4 border-t border-cream-dark">
                      <button
                        onClick={() => {
                          setPendingProvider(embeddingProvider)
                          setShowConfirmDialog(true)
                        }}
                        disabled={regenerating}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          regenerating
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-navy text-white hover:bg-navy-light shadow-medium'
                        }`}
                      >
                        <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} strokeWidth={2} />
                        {regenerating ? 'กำลังสร้าง Embedding ใหม่...' : 'สร้าง Embedding ใหม่ทั้งหมด'}
                      </button>
                      <p className="text-xs text-text-muted mt-2">
                        ใช้เมื่อต้องการอัปเดต embedding ทั้งหมดด้วยโมเดลปัจจุบัน
                      </p>
                    </div>
                  </div>
                </div>

                {/* Embedding Test Section */}
                <div className="card">
                  <div className="p-6 border-b border-cream-dark">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                        <Brain className="w-5 h-5 text-accent" strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="text-lg font-display font-semibold text-navy">
                          ทดสอบ Embedding (รองรับภาษาไทย)
                        </h3>
                        <p className="text-sm text-text-muted">
                          ทดสอบความสามารถของโมเดลในการเปรียบเทียบความคล้ายคลึงของข้อความ
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-900">
                        <strong>💡 ข้อแนะนำ:</strong> โมเดลนี้ทำงานได้ดีที่สุดกับ<strong>ประโยคเต็ม</strong>
                        (มากกว่า 5 คำ) หากใช้คำสั้นๆ อาจได้คะแนนความคล้ายคลึงสูงเกินไป
                      </p>
                    </div>

                    {/* Input Texts */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-navy">
                        ข้อความทดสอบ (อย่างน้อย 2 ข้อความ)
                      </label>
                      {testTexts.map((text, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={text}
                          onChange={(e) => {
                            const newTexts = [...testTexts]
                            newTexts[idx] = e.target.value
                            setTestTexts(newTexts)
                          }}
                          placeholder={`ข้อความที่ ${idx + 1}`}
                          className="input-field"
                          disabled={testing}
                        />
                      ))}
                      <button
                        onClick={() => setTestTexts([...testTexts, ''])}
                        disabled={testing || testTexts.length >= 5}
                        className="text-sm text-accent hover:text-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + เพิ่มข้อความทดสอบ
                      </button>
                    </div>

                    {/* Test Button */}
                    <button
                      onClick={runEmbeddingTest}
                      disabled={testing || testTexts.filter(t => t.trim()).length < 2}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        testing || testTexts.filter(t => t.trim()).length < 2
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-accent text-white hover:bg-accent-hover shadow-medium'
                      }`}
                    >
                      {testing ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" strokeWidth={2} />
                          กำลังทดสอบ...
                        </>
                      ) : (
                        <>
                          <Brain size={16} strokeWidth={2} />
                          ทดสอบ Embedding
                        </>
                      )}
                    </button>

                    {/* Results */}
                    {testResults && (
                      <div className="space-y-4 animate-fade-in">
                        {/* Model Info */}
                        <div className="bg-cream/30 rounded-xl p-4">
                          <p className="text-sm text-text-muted mb-2">โมเดลที่ใช้</p>
                          <p className="font-medium text-navy">{testResults.model.name}</p>
                          <p className="text-sm text-text-muted">Dimensions: {testResults.model.dimensions} | เวลา: {testResults.generationTime}ms</p>
                        </div>

                        {/* Similarity Results */}
                        <div>
                          <p className="text-sm font-medium text-navy mb-3">ความคล้ายคลึงของข้อความ (Cosine Similarity)</p>
                          <div className="space-y-3">
                            {testResults.similarities.map((sim, idx) => (
                              <div key={idx} className="bg-white rounded-xl p-4 border border-cream-dark">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="text-sm text-navy mb-1">"{sim.pair[0]}"</p>
                                    <p className="text-sm text-navy">"{sim.pair[1]}"</p>
                                  </div>
                                  <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                                    sim.score > 0.5
                                      ? 'bg-sage/20 text-sage-dark'
                                      : sim.score > 0
                                      ? 'bg-amber/20 text-amber-dark'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {sim.score.toFixed(4)}
                                  </div>
                                </div>
                                {/* Similarity Bar */}
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      sim.score > 0.5 ? 'bg-sage' : sim.score > 0 ? 'bg-amber' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${Math.max(0, Math.min(100, (sim.score + 1) * 50))}%` }}
                                  />
                                </div>
                                <p className={`text-xs mt-2 ${
                                  sim.score > 0.6 ? 'text-sage-dark' : sim.score > 0.2 ? 'text-amber-dark' : 'text-text-muted'
                                }`}>
                                  {sim.score > 0.6 ? '✅ คล้ายกันมาก (ใช้ประโยคยาวจะได้ผลลัพธ์ดีขึ้น)' : sim.score > 0.2 ? '⚠️ คล้ายกันบางส่วน (ลองใช้ประโยคยาว)' : '❌ ไม่เกี่ยวข้องกัน'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'tts' && (
          <div className="space-y-6">
            <div className="card">
              <div className="p-6 border-b border-cream-dark">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-accent" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-semibold text-navy">
                      ตั้งค่าเสียงสังเคราะห์ (TTS)
                    </h2>
                    <p className="text-sm text-text-muted">
                      เลือกโมเดลเสียงสำหรับผู้ช่วย AI Assistant
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {ttsLoading ? (
              <div className="card">
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-navy mx-auto mb-3 animate-spin" />
                  <p className="text-text-muted">กำลังโหลดข้อมูล...</p>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="p-6 border-b border-cream-dark">
                  <h3 className="text-base font-display font-semibold text-navy">
                    เลือกโมเดลเสียง
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  {Object.values(TTS_PROVIDERS).map((provider) => {
                    const isComingSoon = provider.id === 'google' || provider.id === 'openai'
                    const isDisabled = savingTts || isComingSoon

                    return (
                      <motion.button
                        key={provider.id}
                        onClick={() => !isDisabled && handleTtsProviderChange(provider.id)}
                        disabled={isDisabled}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                          ttsProvider === provider.id
                            ? 'border-accent bg-accent/5'
                            : isComingSoon
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : 'border-cream-dark hover:border-accent/30 hover:bg-cream/20'
                        } ${savingTts ? 'opacity-50' : ''}`}
                        whileHover={!isDisabled ? { scale: 1.01 } : {}}
                        whileTap={!isDisabled ? { scale: 0.99 } : {}}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-navy">{provider.name}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                provider.id === 'botnoi' ? 'bg-sage/20 text-sage-dark' :
                                provider.id === 'edge' ? 'bg-blue/20 text-blue-dark' :
                                isComingSoon ? 'bg-amber/20 text-amber-dark' :
                                'bg-gray-100 text-gray-500'
                              }`}>
                                {isComingSoon ? 'Coming Soon' : provider.badge}
                              </span>
                            </div>
                            <p className="text-sm text-text-secondary">{provider.thaiDescription}</p>
                          </div>
                          {ttsProvider === provider.id && (
                            <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                              <Check size={14} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                          {savingTts && ttsProvider !== provider.id && (
                            <Loader2 size={16} className="animate-spin text-accent" />
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TTS Test Section */}
            <div className="card">
              <div className="p-6 border-b border-cream-dark">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue/10 rounded-xl flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-blue-dark" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-semibold text-navy">
                      ทดสอบเสียงสังเคราะห์
                    </h3>
                    <p className="text-sm text-text-muted">
                      ทดสอบ TTS provider ที่เลือก
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">
                    ข้อความทดสอบ
                  </label>
                  <input
                    type="text"
                    value={ttsTestText}
                    onChange={(e) => setTtsTestText(e.target.value)}
                    placeholder="กรอกข้อความที่ต้องการทดสอบเสียง"
                    className="input-field"
                    disabled={ttsTesting}
                  />
                </div>

                <button
                  onClick={runTtsTest}
                  disabled={ttsTesting || !ttsTestText.trim()}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    ttsTesting || !ttsTestText.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-dark text-white hover:bg-blue shadow-medium'
                  }`}
                >
                  {ttsTesting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" strokeWidth={2} />
                      กำลังสร้างเสียง...
                    </>
                  ) : (
                    <>
                      <Volume2 size={16} strokeWidth={2} />
                      ทดสอบเสียง
                    </>
                  )}
                </button>

                {/* Test Result */}
                {ttsTestResult && (
                  <div className={`rounded-xl p-4 border-2 ${
                    ttsTestResult.success
                      ? 'bg-sage/10 border-sage/30'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    {ttsTestResult.success ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <Check size={16} className="text-sage-dark" strokeWidth={3} />
                          <span className="font-medium text-navy">ทดสอบสำเร็จ</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <p className="text-text-muted">Provider</p>
                            <p className="font-medium text-navy">{ttsTestResult.provider}</p>
                          </div>
                          <div>
                            <p className="text-text-muted">เวลา</p>
                            <p className="font-medium text-navy">{ttsTestResult.latency}ms</p>
                          </div>
                          <div>
                            <p className="text-text-muted">ขนาด</p>
                            <p className="font-medium text-navy">{(ttsTestResult.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <div>
                            <p className="text-text-muted">สถานะ</p>
                            <p className="font-medium text-sage-dark">ปกติ</p>
                          </div>
                        </div>
                        <audio
                          controls
                          src={ttsTestResult.audioUrl}
                          className="w-full"
                          onError={() => toast.error('ไม่สามารถเล่นไฟล์เสียงได้')}
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600" strokeWidth={2} />
                        <span className="text-red-900">ทดสอบล้มเหลว: {ttsTestResult.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Provider Health Status */}
            <div className="card">
              <div className="p-6 border-b border-cream-dark">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sage/10 rounded-xl flex items-center justify-center">
                      <Check size={20} className="text-sage-dark" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-semibold text-navy">
                        สถานะ TTS Providers
                      </h3>
                      <p className="text-sm text-text-muted">
                        ตรวจสอบสถานะความพร้อมของแต่ละ Provider
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetTtsHealth}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-cream-dark text-navy hover:bg-cream/20 transition-colors"
                    >
                      <RotateCcw size={14} strokeWidth={2} />
                      รีเซ็ต
                    </button>
                    <button
                      onClick={checkTtsHealth}
                      disabled={checkingHealth}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        checkingHealth
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-sage text-sage-dark hover:bg-sage-dark hover:text-white'
                      }`}
                    >
                      {checkingHealth ? (
                        <>
                          <Loader2 size={14} className="animate-spin" strokeWidth={2} />
                          กำลังตรวจสอบ...
                        </>
                      ) : (
                        <>
                          <Check size={14} strokeWidth={2} />
                          ตรวจสอบสถานะ
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {ttsHealth ? (
                  <div className="space-y-3">
                    {ttsHealth.providers.map((provider) => (
                      <div
                        key={provider.name}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                          provider.healthy
                            ? 'bg-sage/10 border-sage/30'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            provider.healthy ? 'bg-sage-dark' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-medium text-navy">{provider.name}</p>
                            {provider.latency && (
                              <p className="text-xs text-text-muted">Latency: {provider.latency}ms</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          provider.healthy
                            ? 'bg-sage/20 text-sage-dark'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {provider.healthy ? 'ปกติ' : 'ใช้งานไม่ได้'}
                        </span>
                      </div>
                    ))}
                    {ttsHealth.healthCache && Object.keys(ttsHealth.healthCache).length > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm font-medium text-amber-900 mb-2">
                          ⚠️ Provider ที่ถูกปิดใช้ชั่วคราว:
                        </p>
                        <div className="text-xs text-amber-800 space-y-1">
                          {Object.entries(ttsHealth.healthCache).map(([name, status]) => (
                            status.disabled && (
                              <p key={name}>
                                • {name}: {status.failureCount} ครั้งล้มเหลว
                              </p>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <Check size={32} className="mx-auto mb-2 opacity-30" strokeWidth={2} />
                    <p>คลิก "ตรวจสอบสถานะ" เพื่อดูสถานะของ TTS Providers</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-cream/30 rounded-2xl p-6 border border-cream-dark border-dashed">
              <h4 className="text-sm font-semibold text-navy mb-2 flex items-center gap-2">
                <Info size={14} className="text-accent" /> ข้อมูลเพิ่มเติม
              </h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                การเปลี่ยนโมเดลเสียงจะมีผลทันทีกับ AI Assistant ทุกตัวในระบบ สำหรับโมเดลที่ขึ้นว่า "Coming Soon" จะมีการอัปเดตให้ใช้งานได้ในเวอร์ชันถัดไปเมื่อระบบ API พร้อมรองรับ
              </p>
            </div>
          </div>
        )}

        {activeTab === 'animation' && (
          <div className="space-y-6">
            {/* Animation Section Header */}
            <div className="card">
              <div className="p-6 border-b border-cream-dark">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <Palette className="w-5 h-5 text-accent" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-semibold text-navy">
                      Animation Settings & Preview
                    </h2>
                    <p className="text-sm text-text-muted">
                      ตั้งค่าและแสดงตัวอย่างแอนิเมชันตัวละครแสดงสถานะนักเรียน
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick State Overview */}
            <div className="card">
              <div className="p-4 border-b border-cream-dark">
                <h3 className="text-base font-display font-semibold text-navy">
                  ภาพรวมสถานะทั้งหมด (15 States)
                </h3>
              </div>
              <div className="p-4 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 xl:flex xl:flex-wrap xl:justify-center gap-2">
                {Object.values(emotionStates).map((state) => (
                  <motion.button
                    key={state.name}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-cream/50 transition-colors group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={`${state.displayName} (${state.name})`}
                  >
                    <Suspense fallback={<div className="w-8 h-8 bg-cream/50 rounded-full animate-pulse" />}>
                      <EmotionCharacter
                        state={state.name}
                        intensity={0.5}
                        size="sm"
                      />
                    </Suspense>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: state.colors.primary }}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Animation Preview Panel */}
            <Suspense fallback={<div className="card p-8 text-center text-text-muted">กำลังโหลด...</div>}>
              <AnimationPreview />
            </Suspense>

            {/* Animation Gallery */}
            <Suspense fallback={<div className="card p-8 text-center text-text-muted">กำลังโหลด...</div>}>
              <AnimationGallery />
            </Suspense>

            {/* Animation Info Panel */}
            <div className="card">
              <div className="p-5 border-b border-cream-dark">
                <h3 className="text-base font-display font-semibold text-navy">
                  ข้อมูลแอนิเมชัน
                </h3>
              </div>
              <div className="p-5 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-text-muted border-b border-cream-dark">
                      <th className="pb-3 font-medium">State</th>
                      <th className="pb-3 font-medium">ชื่อไทย</th>
                      <th className="pb-3 font-medium">Motion Type</th>
                      <th className="pb-3 font-medium">สี</th>
                      <th className="pb-3 font-medium">คำอธิบาย</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {Object.values(emotionStates).map((state, idx) => (
                      <tr
                        key={state.name}
                        className={`border-b border-cream-dark/50 hover:bg-cream/30 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-cream/20'
                        }`}
                      >
                        <td className="py-3">
                          <span className="font-mono text-xs text-text-muted">{state.name}</span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${state.bg} ${state.text}`}>
                            {state.displayName}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="text-xs text-text-muted">
                            {state.motion.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: state.colors.primary }}
                            />
                            <span className="text-xs text-text-muted">
                              {state.colors.primary}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-text-secondary max-w-xs truncate">
                          {state.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technical Info */}
            <div className="card bg-navy text-white">
              <div className="p-5 border-b border-navy-light/30">
                <h3 className="text-base font-display font-semibold">
                  ข้อมูลทางเทคนิค
                </h3>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-navy-light/20 rounded-xl p-4">
                    <p className="text-navy-light font-medium mb-1">Animation Library</p>
                    <p className="text-white/80">Framer Motion</p>
                  </div>
                  <div className="bg-navy-light/20 rounded-xl p-4">
                    <p className="text-navy-light font-medium mb-1">States</p>
                    <p className="text-white/80">15 predefined states</p>
                  </div>
                  <div className="bg-navy-light/20 rounded-xl p-4">
                    <p className="text-navy-light font-medium mb-1">Intensity Range</p>
                    <p className="text-white/80">0.0 - 1.0 (adjustable)</p>
                  </div>
                </div>
                <div className="bg-navy-light/20 rounded-xl p-4">
                  <p className="text-navy-light font-medium mb-2">How to extend with new states:</p>
                  <ol className="text-white/80 space-y-1 list-decimal list-inside">
                    <li>เพิ่ม state config ใน <code className="bg-navy-light/40 px-1.5 py-0.5 rounded">src/animation-showcase/emotionConfig.js</code></li>
                    <li>กำหนด colors, motion, facial expression</li>
                    <li>เพิ่ม animation preset ใน <code className="bg-navy-light/40 px-1.5 py-0.5 rounded">getAnimationPreset()</code></li>
                    <li>เพิ่ม facial expression ใน <code className="bg-navy-light/40 px-1.5 py-0.5 rounded">getFacialExpression()</code></li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card">
            <div className="p-6 border-b border-cream-dark">
              <h2 className="text-lg font-display font-semibold text-navy">การตั้งค่าการแจ้งเตือน</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">แจ้งเตือนเมื่อมีนักเรียนใหม่</p>
                  <p className="text-sm text-text-muted">รับการแจ้งเตือนเมื่อมีการลงทะเบียนนักเรียนใหม่</p>
                </div>
                <button className="w-12 h-6 bg-sage rounded-full relative">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">แจ้งเตือนเมื่อมีการอัปเดตเกรด</p>
                  <p className="text-sm text-text-muted">รับการแจ้งเตือนเมื่อมีการบันทึกเกรดใหม่</p>
                </div>
                <button className="w-12 h-6 bg-sage rounded-full relative">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'access-control' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="card">
              <div className="p-6 border-b border-cream-dark">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-navy" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-display font-semibold text-navy">
                      AI Access Control Settings
                    </h2>
                    <p className="text-sm text-text-muted">
                      จัดการสิทธิ์การเข้าถึงข้อมูลสำหรับแต่ละบทบาทผู้ใช้
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-cream-dark hover:bg-cream/20 transition-colors text-text-secondary"
                  >
                    <RotateCcw size={14} strokeWidth={2} />
                    รีเซ็ตค่าเริ่มต้น
                  </button>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="card bg-blue-50 border-blue-200">
              <div className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div className="flex-1 text-sm text-blue-900">
                  <p className="font-medium mb-1">การตั้งค่านี้กำหนดสิทธิ์การเข้าถึงข้อมูลผ่าน AI Assistant</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• <strong>SELF</strong>: เข้าถึงเฉพาะข้อมูลของตัวเอง</li>
                    <li>• <strong>CHILDREN</strong>: เข้าถึงข้อมูลของบุตรหลาน (สำหรับผู้ปกครอง)</li>
                    <li>• <strong>CLASS</strong>: เข้าถึงข้อมูลนักเรียนในคลาสที่สอน (สำหรับครู)</li>
                    <li>• <strong>ALL</strong>: เข้าถึงข้อมูลทั้งหมด (สำหรับแอดมิน)</li>
                    <li>• <strong>NONE</strong>: ไม่อนุญาตให้เข้าถึง</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {policiesLoading ? (
              <div className="card">
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-navy mx-auto mb-3 animate-spin" />
                  <p className="text-text-muted">กำลังโหลดนโยบายการเข้าถึง...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Policies Table - Grouped by Resource */}
                {['grades', 'attendance', 'schedule', 'knowledge_base', 'classes'].filter(resource =>
                  policies.some(p => p.resource === resource)
                ).map(resource => {
                  const resourcePolicies = policies.filter(p => p.resource === resource)
                  const resourceNames = {
                    grades: 'เกรด (Grades)',
                    attendance: 'การเข้าเรียน (Attendance)',
                    schedule: 'ตารางเรียน (Schedule)',
                    knowledge_base: 'ฐานความรู้ (Knowledge Base)',
                    classes: 'คลาสเรียน (Classes)'
                  }

                  return (
                    <div key={resource} className="card">
                      <div className="p-4 border-b border-cream-dark bg-cream/30">
                        <h3 className="text-base font-display font-semibold text-navy">
                          {resourceNames[resource] || resource}
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm text-text-muted border-b border-cream-dark">
                              <th className="p-4 font-medium">บทบาท (Role)</th>
                              <th className="p-4 font-medium">การกระทำ (Action)</th>
                              <th className="p-4 font-medium">ขอบเขต (Scope)</th>
                              <th className="p-4 font-medium">สถานะ (Status)</th>
                              <th className="p-4 font-medium w-24"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {resourcePolicies.map(policy => {
                              const roleNames = {
                                student: 'นักเรียน',
                                teacher: 'ครู',
                                parent: 'ผู้ปกครอง',
                                admin: 'แอดมิน',
                                public: 'สาธารณะ'
                              }
                              const actionNames = {
                                read: 'อ่าน',
                                write: 'เขียน',
                                manage: 'จัดการ',
                                query: 'ค้นหา'
                              }

                              const isSaving = savingPolicy === policy.id
                              const isAllScope = policy.scope === 'ALL'

                              return (
                                <tr
                                  key={policy.id}
                                  className="border-b border-cream-dark/50 hover:bg-cream/20 transition-colors"
                                >
                                  <td className="p-4">
                                    <span className="inline-flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                        policy.role === 'admin' ? 'bg-navy/10 text-navy' :
                                        policy.role === 'teacher' ? 'bg-sage/20 text-sage-dark' :
                                        policy.role === 'student' ? 'bg-accent/20 text-accent-dark' :
                                        policy.role === 'parent' ? 'bg-amber/20 text-amber-dark' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {roleNames[policy.role] || policy.role}
                                      </span>
                                    </span>
                                  </td>
                                  <td className="p-4 text-sm text-navy">
                                    {actionNames[policy.action] || policy.action}
                                  </td>
                                  <td className="p-4">
                                    <select
                                      value={policy.scope}
                                      onChange={(e) => handleScopeChange(policy.id, e.target.value)}
                                      disabled={isSaving}
                                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                        isAllScope
                                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                                          : policy.scope === 'NONE'
                                          ? 'border-red-200 bg-red-50 text-red-700'
                                          : 'border-cream-dark bg-white hover:border-navy/30'
                                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <option value="SELF">SELF (ตัวเอง)</option>
                                      <option value="CHILDREN">CHILDREN (บุตรหลาน)</option>
                                      <option value="CLASS">CLASS (คลาสที่สอน)</option>
                                      <option value="ALL">ALL (ทั้งหมด)</option>
                                      <option value="NONE">NONE (ไม่อนุญาต)</option>
                                    </select>
                                    {isAllScope && (
                                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                        <AlertTriangle size={10} strokeWidth={2} />
                                        <span>เข้าถึงข้อมูลทั้งหมด</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <button
                                      onClick={() => {
                                        const newState = !policy.enabled
                                        handleEnabledToggle(policy.id, newState)
                                        updatePolicy(policy.id, { enabled: newState })
                                      }}
                                      disabled={isSaving}
                                      className={`relative w-12 h-6 rounded-full transition-colors ${
                                        policy.enabled ? 'bg-sage' : 'bg-gray-200'
                                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                                        policy.enabled ? 'right-1' : 'left-1'
                                      }`} />
                                    </button>
                                  </td>
                                  <td className="p-4">
                                    {policy._changed === true ? (
                                      <button
                                        onClick={() => updatePolicy(policy.id, {
                                          scope: policy.scope,
                                          enabled: policy.enabled
                                        })}
                                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-navy text-white hover:bg-navy-light transition-colors"
                                      >
                                        {isSaving ? (
                                          <RefreshCw size={12} className="animate-spin" />
                                        ) : (
                                          <>
                                            <Save size={12} />
                                            บันทึก
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <span className="text-xs text-text-muted">
                                        {isSaving ? 'กำลังบันทึก...' : '—'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}

                {/* Save All Button */}
                {hasChanges && (
                  <div className="fixed bottom-6 right-6 z-10">
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={saveAllChanges}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-navy text-white shadow-lg hover:bg-navy-light transition-colors"
                    >
                      <Save size={18} strokeWidth={2} />
                      บันทึกการเปลี่ยนแปลงทั้งหมด
                    </motion.button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card">
            <div className="p-6 border-b border-cream-dark">
              <h2 className="text-lg font-display font-semibold text-navy">ความปลอดภัย</h2>
            </div>
            <div className="p-6">
              <p className="text-text-muted">การตั้งค่าความปลอดภัยจะมาเร็วๆ นี้</p>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="card">
            <div className="p-6 border-b border-cream-dark">
              <h2 className="text-lg font-display font-semibold text-navy">จัดการข้อมูล</h2>
            </div>
            <div className="p-6">
              <p className="text-text-muted">การตั้งค่าข้อมูลจะมาเร็วๆ นี้</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-navy">ยืนยันการเปลี่ยนโมเดล?</h3>
                <p className="text-sm text-text-muted">
                  {pendingProvider && `เปลี่ยนเป็น ${EMBEDDING_MODELS[pendingProvider]?.name}`}
                </p>
              </div>
            </div>

            <div className="bg-cream/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-navy">
                การดำเนินการนี้จะ:
              </p>
              <ul className="text-sm text-text-secondary mt-2 space-y-1 list-disc list-inside">
                <li>เปลี่ยน provider ของ embedding model</li>
                <li>สร้าง embedding ใหม่ทั้งหมดในฐานข้อมูล</li>
                <li>ใช้เวลาสักครู่ขึ้นอยู่กับจำนวนข้อมูล</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelProviderChange}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-cream-dark text-navy hover:bg-cream/20 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmProviderChange}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-navy text-white hover:bg-navy-light shadow-medium transition-colors"
              >
                ยืนยันและสร้างใหม่
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reset Policies Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-red-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-navy">รีเซ็ตนโยบายการเข้าถึง?</h3>
                <p className="text-sm text-text-muted">
                  คืนค่าเป็นค่าเริ่มต้นของระบบ
                </p>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4 mb-6 border border-red-200">
              <p className="text-sm text-red-900 font-medium">
                ⚠️ การดำเนินการนี้จะ:
              </p>
              <ul className="text-sm text-red-800 mt-2 space-y-1 list-disc list-inside">
                <li>ลบนโยบายทั้งหมดที่กำหนดเอง</li>
                <li>คืนค่าเป็นค่าเริ่มต้นของระบบ</li>
                <li>การเปลี่ยนแปลงที่กำหนดเองจะหายไป</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-cream-dark text-navy hover:bg-cream/20 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={resetToDefaults}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 shadow-medium transition-colors"
              >
                ยืนยันการรีเซ็ต
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default SystemSettings
