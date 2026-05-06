/**
 * EmotionCharacter - Animated student status character
 * Uses framer-motion for smooth, purposeful animations
 */

import { motion } from 'framer-motion'
import { getFacialExpression, emotionStates, getAnimationPreset } from './emotionConfig'

const EmotionCharacter = ({
  state = 'positive',
  intensity = 0.5,
  size = 'md',
  showLabel = false
}) => {
  // Fallback to "positive" if state is undefined, null, or invalid
  const defaultState = state || 'positive'
  const config = emotionStates[defaultState]
  const colors = config?.colors || emotionStates.neutral.colors
  const animation = getAnimationPreset(defaultState, intensity)
  const expression = getFacialExpression(defaultState)

  const sizeMap = {
    sm: { container: 80, svg: 64 },
    md: { container: 120, svg: 96 },
    lg: { container: 160, svg: 128 },
    xl: { container: 240, svg: 192 }
  }

  const { container: containerSize, svg: svgSize } = sizeMap[size] || sizeMap.md

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Character Container */}
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
        {...animation}
      >
        {/* Background Circle */}
        <div
          className={`absolute rounded-full ${colors.bg} ${size === 'lg' || size === 'xl' ? 'w-full h-full' : 'w-4/5 h-4/5'}`}
          style={{ backgroundColor: `${colors.primary}15` }}
        />

        {/* SVG Character - Nong Noy */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Hair - Back */}
          <ellipse cx="32" cy="20" rx="18" ry="14" fill="#3d3d3d" />

          {/* Face */}
          <ellipse
            cx="32"
            cy="32"
            rx="16"
            ry="18"
            fill="#f9d9b6"
          />

          {/* Hair Spikes - Front */}
          <path
            d="M 18 18 L 20 12 L 24 16 L 26 10 L 30 14 L 34 10 L 36 16 L 40 12 L 42 18"
            stroke="#3d3d3d"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Ears */}
          <ellipse cx="16" cy="32" rx="3" ry="4" fill="#f0c4a0" />
          <ellipse cx="48" cy="32" rx="3" ry="4" fill="#f0c4a0" />

          {/* Eyebrows */}
          <motion.path
            d={expression.eyebrow.left}
            stroke="#3d3d3d"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
          <motion.path
            d={expression.eyebrow.right}
            stroke="#3d3d3d"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Eyes */}
          <motion.path
            d={expression.eyes.left}
            stroke="#1a1a2e"
            strokeWidth="1.5"
            fill="white"
            strokeLinecap="round"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          />
          <motion.path
            d={expression.eyes.right}
            stroke="#1a1a2e"
            strokeWidth="1.5"
            fill="white"
            strokeLinecap="round"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          />

          {/* Pupils */}
          <motion.circle
            cx="24"
            cy="28"
            r="2"
            fill="#1a1a2e"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.2 }}
          />
          <motion.circle
            cx="40"
            cy="28"
            r="2"
            fill="#1a1a2e"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.2 }}
          />

          {/* Nose */}
          <circle cx="32" cy="34" r="1.5" fill="#f0c4a0" opacity="0.5" />

          {/* Mouth */}
          <motion.path
            d={expression.mouth}
            stroke="#c94a5a"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />

          {/* Blush (conditional) */}
          {config?.facial?.blush && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.5 }}
            >
              <ellipse cx="20" cy="36" rx="4" ry="2" fill="#ffb3ba" />
              <ellipse cx="44" cy="36" rx="4" ry="2" fill="#ffb3ba" />
            </motion.g>
          )}

          {/* Body/Shoulders */}
          <path
            d="M 16 52 Q 32 48 48 52 L 48 64 L 16 64 Z"
            fill={colors.primary}
          />

          {/* Collar */}
          <path
            d="M 26 52 L 32 58 L 38 52"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* State Indicator Dot */}
        <div
          className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: colors.primary }}
        />
      </motion.div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className={`text-sm font-semibold ${colors.text}`}>
            {config?.displayName || 'Unknown'}
          </p>
          <p className="text-xs text-text-muted max-w-[100px]">
            {config?.description || ''}
          </p>
        </div>
      )}
    </div>
  )
}

export default EmotionCharacter
