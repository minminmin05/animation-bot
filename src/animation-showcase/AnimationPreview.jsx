/**
 * AnimationPreview - Interactive preview with state & intensity controls
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EmotionCharacter from './EmotionCharacter'
import { emotionStates } from './emotionConfig'

const AnimationPreview = () => {
  const [selectedState, setSelectedState] = useState('positive')
  const [intensity, setIntensity] = useState(0.5)
  const [size, setSize] = useState('lg')

  const config = emotionStates[selectedState]

  const handleStateChange = (e) => {
    setSelectedState(e.target.value)
  }

  const handleIntensityChange = (e) => {
    setIntensity(parseFloat(e.target.value))
  }

  const handleSizeChange = (newSize) => {
    setSize(newSize)
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-cream-dark">
        <h2 className="text-base font-display font-semibold text-navy mb-1">
          ตัวอย่างแบบโต้ตอบ
        </h2>
        <p className="text-xs text-text-muted">
          เลือกสถานะและปรับความเข้มของแอนิเมชัน
        </p>
      </div>

      <div className="p-4">
        {/* Preview Area */}
        <div className="flex flex-col items-center justify-center mb-6 p-6 bg-cream/30 rounded-2xl min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedState}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <EmotionCharacter
                state={selectedState}
                intensity={intensity}
                size={size}
                showLabel={true}
              />
            </motion.div>
          </AnimatePresence>

          {/* State Badge */}
          <motion.div
            key={`badge-${selectedState}`}
            className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 ${config.bg} ${config.text} ${config.border}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.colors.primary }}
            />
            {config.displayName}
          </motion.div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* State Selector */}
          <div>
            <label className="block text-sm font-medium text-navy mb-2">
              เลือกสถานะ (State)
            </label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="input-field w-full text-sm"
            >
              {Object.values(emotionStates).map((state) => (
                <option key={state.name} value={state.name}>
                  {state.displayName} ({state.name})
                </option>
              ))}
            </select>
          </div>

          {/* Intensity Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-navy">
                ความเข้มแอนิเมชัน
              </label>
              <span className="text-sm font-mono text-accent">
                {Math.round(intensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={intensity}
              onChange={handleIntensityChange}
              className="w-full h-2 bg-cream-dark rounded-full appearance-none cursor-pointer"
              style={{ accentColor: config.colors.primary }}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <label className="block text-sm font-medium text-navy mb-2">
              ขนาดตัวละคร (Size)
            </label>
            <div className="flex gap-2">
              {['sm', 'md', 'lg', 'xl'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSizeChange(s)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    size === s
                      ? `${config.bg} ${config.text} border-2 ${config.border}`
                      : 'bg-cream text-text-muted hover:bg-cream-dark'
                  }`}
                >
                  {s === 'sm' && 'S'}
                  {s === 'md' && 'M'}
                  {s === 'lg' && 'L'}
                  {s === 'xl' && 'XL'}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Info */}
          <div className={`p-3 rounded-xl ${config.bg} border ${config.border}`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: config.colors.primary }}>
                <span className="text-white text-xs">ℹ️</span>
              </div>
              <div className="flex-1">
                <p className={`text-xs font-semibold ${config.text}`}>
                  {config.motion.type.replace('_', ' ').toUpperCase()}
                </p>
                <p className="text-[10px] text-text-muted">
                  {config.motion.duration}s • {config.motion.ease}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnimationPreview
