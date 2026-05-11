/**
 * Luna Assistant Settings Hook
 * Manages assistant style and quality preferences
 */

import { useState, useEffect } from 'react'
import type { QualityLevel } from '../components/luna-assistant/lunaConfig'

export type AssistantStyle = 'luna' | 'legacy'

const LUNA_SETTINGS_KEY = 'luna_assistant_settings'

interface LunaSettings {
  style: AssistantStyle
  quality: QualityLevel
}

const DEFAULT_SETTINGS: LunaSettings = {
  style: 'luna', // Luna is the default
  quality: 'high',
}

export const useLunaSettings = () => {
  const [settings, setSettings] = useState<LunaSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LUNA_SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(prev => ({
          ...prev,
          ...parsed,
        }))
      }
    } catch (error) {
      console.error('[LunaSettings] Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save settings to localStorage when they change
  const updateSettings = (newSettings: Partial<LunaSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      try {
        localStorage.setItem(LUNA_SETTINGS_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('[LunaSettings] Failed to save settings:', error)
      }
      return updated
    })
  }

  const setStyle = (style: AssistantStyle) => {
    updateSettings({ style })
  }

  const setQuality = (quality: QualityLevel) => {
    updateSettings({ quality })
  }

  return {
    settings,
    setStyle,
    setQuality,
    updateSettings,
    isLoading,
  }
}

export default useLunaSettings
