import { Request, Response } from 'express'
import { getEmbeddingConfig, setEmbeddingProvider } from '../embeddings/index.js'
import { supabase } from '../services/supabase.js'

// Cache for system settings to avoid frequent DB queries
let settingsCache: any = null
let cacheExpiry = 0
const CACHE_TTL = 60000 // 1 minute

/**
 * Get system settings from database
 */
export async function getSystemSettings() {
  // Check cache first
  if (settingsCache && Date.now() < cacheExpiry) {
    return settingsCache
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 'settings')
    .single()

  if (error) {
    console.error('[Settings API] Error fetching system settings:', error)
    // Return default settings on error
    return {
      school_name: 'Lumaid School',
      school_name_thai: 'โรงเรียนลุมายด์',
      default_language: 'th',
      timezone: 'Asia/Bangkok',
      primary_color: '#1a2744',
      accent_color: '#e07a5f'
    }
  }

  settingsCache = data
  cacheExpiry = Date.now() + CACHE_TTL
  return data
}

/**
 * Get user notification settings
 */
async function getNotificationSettings(userId: string) {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('[Settings API] Error fetching notification settings:', error)
    return {}
  }

  // Convert to key-value object
  const settings: Record<string, boolean> = {}
  const defaultSettings = [
    { key: 'new_student', enabled: true },
    { key: 'grade_update', enabled: true },
    { key: 'attendance_alert', enabled: true },
    { key: 'schedule_change', enabled: true },
    { key: 'payment_reminder', enabled: true },
    { key: 'announcement', enabled: true }
  ]

  // Set defaults
  defaultSettings.forEach(s => {
    settings[s.key] = s.enabled
  })

  // Override with user settings
  data.forEach((s: any) => {
    settings[s.key] = s.enabled
  })

  return settings
}

/**
 * Update user notification settings
 */
async function saveNotificationSettings(userId: string, settings: Record<string, boolean>) {
  const updates = Object.entries(settings).map(([key, enabled]) => {
    return supabase
      .from('notification_settings')
      .upsert({ user_id: userId, key, enabled }, { onConflict: 'user_id,key' })
  })

  await Promise.all(updates)
}

/**
 * Get current system settings (all settings combined)
 */
export async function getSettings(req: Request, res: Response) {
  try {
    console.log('[Settings API] GET /api/settings')

    const embedConfig = getEmbeddingConfig()
    const systemSettings = await getSystemSettings()

    // Get notification settings if user is authenticated
    let notificationSettings = {}
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        notificationSettings = await getNotificationSettings(user.id)
      }
    }

    console.log('[Settings API] Current config:', embedConfig)

    res.json({
      general: {
        schoolName: systemSettings.school_name,
        schoolNameThai: systemSettings.school_name_thai,
        language: systemSettings.default_language,
        timezone: systemSettings.timezone
      },
      theme: {
        primaryColor: systemSettings.primary_color,
        accentColor: systemSettings.accent_color
      },
      embedding: {
        provider: embedConfig.provider,
        modelName: embedConfig.modelName,
        dimensions: embedConfig.dimensions
      },
      llm: {
        provider: process.env.LLM_PROVIDER || 'minimax',
        model: process.env.MINIMAX_MODEL || process.env.GEMINI_MODEL || 'abab6.5s-chat'
      },
      tts: {
        provider: systemSettings.tts_provider || 'empty'
      },
      notifications: notificationSettings
    })
  } catch (error) {
    console.error('[Settings API] Error getting settings:', error)
    res.status(500).json({ error: 'Failed to get settings', message: String(error) })
  }
}

/**
 * Update general system settings
 */
export async function updateGeneralSettings(req: Request, res: Response) {
  try {
    const { schoolName, schoolNameThai, language, timezone } = req.body

    console.log('[Settings API] POST /api/settings/general')
    console.log('[Settings API] Request body:', { schoolName, schoolNameThai, language, timezone })

    // Verify user is admin
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return res.status(403).json({ error: 'Forbidden - Admin only' })
    }

    // Update settings
    const { error } = await supabase
      .from('system_settings')
      .update({
        school_name: schoolName,
        school_name_thai: schoolNameThai,
        default_language: language,
        timezone: timezone,
        updated_by: user.id
      })
      .eq('id', 'settings')

    if (error) {
      throw error
    }

    // Clear cache
    settingsCache = null
    cacheExpiry = 0

    res.json({
      success: true,
      message: 'General settings updated successfully',
      settings: {
        schoolName,
        schoolNameThai,
        language,
        timezone
      }
    })
  } catch (error) {
    console.error('[Settings API] Error updating general settings:', error)
    res.status(500).json({ error: 'Failed to update general settings', message: String(error) })
  }
}

/**
 * Update theme settings
 */
export async function updateThemeSettings(req: Request, res: Response) {
  try {
    const { primaryColor, accentColor } = req.body

    console.log('[Settings API] POST /api/settings/theme')
    console.log('[Settings API] Request body:', { primaryColor, accentColor })

    // Verify user is admin
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return res.status(403).json({ error: 'Forbidden - Admin only' })
    }

    // Update settings
    const { error } = await supabase
      .from('system_settings')
      .update({
        primary_color: primaryColor,
        accent_color: accentColor,
        updated_by: user.id
      })
      .eq('id', 'settings')

    if (error) {
      throw error
    }

    // Clear cache
    settingsCache = null
    cacheExpiry = 0

    res.json({
      success: true,
      message: 'Theme settings updated successfully',
      settings: {
        primaryColor,
        accentColor
      }
    })
  } catch (error) {
    console.error('[Settings API] Error updating theme settings:', error)
    res.status(500).json({ error: 'Failed to update theme settings', message: String(error) })
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(req: Request, res: Response) {
  try {
    const settings = req.body

    console.log('[Settings API] POST /api/settings/notifications')
    console.log('[Settings API] Request body:', settings)

    // Verify user is authenticated
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    await saveNotificationSettings(user.id, settings)

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings
    })
  } catch (error) {
    console.error('[Settings API] Error updating notification settings:', error)
    res.status(500).json({ error: 'Failed to update notification settings', message: String(error) })
  }
}

/**
 * Update embedding provider
 * This updates the in-memory environment variable and triggers regeneration
 */
export async function updateEmbeddingProvider(req: Request, res: Response) {
  try {
    const { provider } = req.body

    console.log('[Settings API] POST /api/settings/embedding')
    console.log('[Settings API] Request body:', { provider })

    // Validate provider
    if (!provider || (provider !== 'openai' && provider !== 'local')) {
      console.error('[Settings API] Invalid provider:', provider)
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be "openai" or "local"'
      })
    }

    // Get current config before change
    const beforeConfig = getEmbeddingConfig()
    console.log('[Settings API] Before change:', beforeConfig)

    // Update provider using the new function
    setEmbeddingProvider(provider)

    // Get config after change
    const afterConfig = getEmbeddingConfig()
    console.log('[Settings API] After change:', afterConfig)

    res.json({
      success: true,
      message: `Embedding provider set to ${provider}`,
      config: {
        provider: afterConfig.provider,
        modelName: afterConfig.modelName,
        dimensions: afterConfig.dimensions
      }
    })
  } catch (error) {
    console.error('[Settings API] Error updating provider:', error)
    res.status(500).json({
      error: 'Failed to update provider',
      message: String(error)
    })
  }
}

/**
 * Trigger embedding regeneration
 */
export async function regenerateEmbeddings(req: Request, res: Response) {
  try {
    console.log('[Settings API] POST /api/embeddings/regenerate')

    // Get current config to log
    const config = getEmbeddingConfig()
    console.log('[Settings API] Regenerating with config:', config)

    // Import and run regeneration
    const { regenerateEmbeddings } = await import('../rag/ingest.js')

    // Start regeneration in background
    regenerateEmbeddings().then((result) => {
      console.log(`[Settings API] Regeneration complete: ${result.regenerated} embeddings`)
    }).catch((error) => {
      console.error('[Settings API] Regeneration failed:', error)
    })

    res.json({
      success: true,
      message: 'Embedding regeneration started. This may take a few minutes.',
      config: {
        provider: config.provider,
        modelName: config.modelName,
        dimensions: config.dimensions
      }
    })
  } catch (error) {
    console.error('[Settings API] Error regenerating embeddings:', error)
    res.status(500).json({
      error: 'Failed to regenerate embeddings',
      message: String(error)
    })
  }
}

/**
 * Get embedding regeneration status
 */
export async function getRegenerationStatus(req: Request, res: Response) {
  try {
    console.log('[Settings API] GET /api/embeddings/regenerate/status')

    // For now, return a simple status
    // In production, you'd track actual regeneration progress
    res.json({
      status: 'idle',
      lastRegenerated: null
    })
  } catch (error) {
    console.error('[Settings API] Error getting status:', error)
    res.status(500).json({ error: 'Failed to get status' })
  }
}

/**
 * Update LLM settings
 */
export async function updateLlmSettings(req: Request, res: Response) {
  try {
    const { provider, apiKey, model } = req.body

    console.log('[Settings API] POST /api/settings/llm')
    console.log('[Settings API] Request body:', { provider, model: model ? '***' : undefined })

    // Validate provider
    const validProviders = ['gemini', 'minimax']
    if (!provider || !validProviders.includes(provider)) {
      console.error('[Settings API] Invalid provider:', provider)
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: ${validProviders.join(', ')}`
      })
    }

    // Get user info if authenticated (for tracking), but don't require auth
    let userId = null
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (!authError && user) {
        userId = user.id
      }
    }

    // Update environment variable for provider (runtime only)
    process.env.LLM_PROVIDER = provider

    // If API key is provided, update the environment variable (runtime only)
    if (apiKey && provider === 'minimax') {
      process.env.MINIMAX_API_KEY = apiKey
    }
    if (apiKey && provider === 'gemini') {
      process.env.GEMINI_API_KEY = apiKey
    }

    // If model is provided, update environment variable (runtime only)
    if (model) {
      if (provider === 'minimax') {
        process.env.MINIMAX_MODEL = model
      } else if (provider === 'gemini') {
        process.env.GEMINI_MODEL = model
      }
    }

    // Store in database for persistence
    const updateData: any = {
      llm_provider: provider,
      llm_model: model || (provider === 'minimax' ? 'abab6.5s-chat' : 'gemini-2.5-flash')
    }
    if (userId) {
      updateData.updated_by = userId
    }

    const { error } = await supabase
      .from('system_settings')
      .update(updateData)
      .eq('id', 'settings')

    if (error) {
      // If column doesn't exist yet, just ignore (for backward compatibility)
      console.log('[Settings API] Note: llm_provider column may not exist in database yet')
    }

    // Clear cache
    settingsCache = null
    cacheExpiry = 0

    // Define provider info
    const providerInfo: Record<string, { name: string; description: string; models: string[] }> = {
      gemini: {
        name: 'Google Gemini',
        description: 'Google\'s Gemini AI models - Fast and capable',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro']
      },
      minimax: {
        name: 'MiniMax',
        description: 'MiniMax AI - High quality Chinese/Thai language support',
        models: ['abab6.5s-chat', 'abab6.5-chat', 'abab5.5-chat']
      }
    }

    res.json({
      success: true,
      message: 'LLM settings updated successfully',
      llm: {
        provider,
        model: model || (provider === 'minimax' ? 'abab6.5s-chat' : 'gemini-2.5-flash'),
        info: providerInfo[provider]
      }
    })
  } catch (error) {
    console.error('[Settings API] Error updating LLM settings:', error)
    res.status(500).json({ error: 'Failed to update LLM settings', message: String(error) })
  }
}

/**
 * Update TTS settings
 */
export async function updateTtsSettings(req: Request, res: Response) {
  try {
    const { provider } = req.body

    console.log('[Settings API] POST /api/settings/tts')
    console.log('[Settings API] Request body:', { provider })

    // Validate provider
    const validProviders = ['empty', 'botnoi', 'edge', 'google', 'openai']
    if (!provider || !validProviders.includes(provider)) {
      console.error('[Settings API] Invalid provider:', provider)
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: ${validProviders.join(', ')}`
      })
    }

    // Get user info if authenticated (for tracking), but don't require auth
    let userId = null
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (!authError && user) {
        userId = user.id
      }
    }

    // Update settings
    const updateData: any = { tts_provider: provider }
    if (userId) {
      updateData.updated_by = userId
    }

    const { error } = await supabase
      .from('system_settings')
      .update(updateData)
      .eq('id', 'settings')

    if (error) {
      throw error
    }

    // Clear cache
    settingsCache = null
    cacheExpiry = 0

    res.json({
      success: true,
      message: 'TTS settings updated successfully',
      tts: {
        provider,
        availableProviders: validProviders
      }
    })
  } catch (error) {
    console.error('[Settings API] Error updating TTS settings:', error)
    res.status(500).json({ error: 'Failed to update TTS settings', message: String(error) })
  }
}
