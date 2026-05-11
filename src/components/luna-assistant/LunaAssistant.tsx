/**
 * Luna Assistant - Premium Moon Knowledge Spirit
 * A cinematic, magical, floating moon spirit with depth and personality
 */

import { motion, AnimatePresence, useAnimation, useTransform } from 'framer-motion'
import { useMemo, useRef, useEffect, useState } from 'react'
import { LUNA_COLORS, type LunaState, type ReactionType, type QualityLevel } from './lunaConfig'

interface LunaAssistantProps {
  state?: LunaState
  reaction?: ReactionType
  quality?: QualityLevel
  size?: number
  mouthOpen?: number
  onStateChange?: (state: LunaState) => void
  className?: string
}

export const LunaAssistant = ({
  state: externalState = 'idle',
  reaction: externalReaction,
  quality = 'high',
  size = 280,
  mouthOpen: externalMouthOpen = 0,
  onStateChange,
  className = '',
}: LunaAssistantProps) => {
  const controls = useAnimation()
  const [internalMouthOpen, setInternalMouthOpen] = useState(0)
  const [breathingPhase, setBreathingPhase] = useState(0)
  const [orbitRotation, setOrbitRotation] = useState(0)
  const [floatOffset, setFloatOffset] = useState(0)

  // Use external or internal mouth open value
  const mouthOpen = externalMouthOpen !== undefined ? externalMouthOpen : internalMouthOpen

  // Breathing animation
  useEffect(() => {
    let raf: number
    const startTime = performance.now()

    const animate = (time: number) => {
      const elapsed = time - startTime
      // Slow breathing cycle (4 seconds)
      const breathing = Math.sin(elapsed * 0.0015) * 0.5 + 0.5
      setBreathingPhase(breathing)

      // Float offset with inertia
      const floatY = Math.sin(elapsed * 0.0008) * 12 + Math.sin(elapsed * 0.0013) * 5
      setFloatOffset(floatY)

      // Orbit rotation with smooth continuous motion
      setOrbitRotation(elapsed * 0.02)

      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  // State-based animation values
  const stateIntensity = useMemo(() => {
    switch (externalState) {
      case 'thinking': return 1.2
      case 'listening': return 1.1
      case 'talking': return 1.0
      case 'reaction': return 1.3
      default: return 0.8
    }
  }, [externalState])

  // Glow intensity based on state and talking
  const glowIntensity = useMemo(() => {
    const baseGlow = 0.6 + breathingPhase * 0.2
    const talkingBoost = externalState === 'talking' ? mouthOpen * 0.3 : 0
    return Math.min(1, baseGlow + talkingBoost)
  }, [breathingPhase, externalState, mouthOpen])

  // Body bounce during talking
  const bodyBounce = useMemo(() => {
    if (externalState === 'talking' && mouthOpen > 0.1) {
      return Math.sin(Date.now() * 0.02) * mouthOpen * 3
    }
    return 0
  }, [externalState, mouthOpen])

  // Quality-based configuration
  const qualityConfig = useMemo(() => {
    switch (quality) {
      case 'high':
        return {
          particles: 25,
          glowLayers: 3,
          shadowBlur: 30,
          orbitGlow: true,
          thinkingParticles: 12,
        }
      case 'medium':
        return {
          particles: 12,
          glowLayers: 2,
          shadowBlur: 15,
          orbitGlow: true,
          thinkingParticles: 6,
        }
      case 'low':
        return {
          particles: 0,
          glowLayers: 1,
          shadowBlur: 8,
          orbitGlow: false,
          thinkingParticles: 0,
        }
    }
  }, [quality])

  // Reaction colors
  const reactionColors = useMemo(() => {
    const colors = {
      happy: { primary: '#FFE066', glow: '#FFF4B8', accent: '#FFD700' },
      success: { primary: '#66D9FF', glow: '#CCEFFF', accent: '#00B4D8' },
      confused: { primary: '#FFB347', glow: '#FFE4B8', accent: '#FF9500' },
      apology: { primary: '#FF8FA3', glow: '#FFD4DD', accent: '#FF4D6D' },
      greeting: { primary: '#C4B5FD', glow: '#EDE9FE', accent: '#A78BFA' },
      default: { primary: '#E8E4F0', glow: '#F5F3FF', accent: '#C4B5FD' },
    }
    return colors[externalReaction] || colors.default
  }, [externalReaction])

  const currentColors = externalState === 'reaction' ? reactionColors : LUNA_COLORS

  // Mouth shape with smooth interpolation
  const mouthPath = useMemo(() => {
    const open = Math.max(0, Math.min(1, mouthOpen))
    if (open < 0.15) {
      // Closed - gentle smile curve
      return 'M 40 50 Q 50 52 60 50'
    } else if (open < 0.4) {
      // Slightly open
      const y = 50 + open * 15
      return `M 38 50 Q 50 ${y} 62 50`
    } else if (open < 0.7) {
      // Half open - oval shape
      const y = 53 + open * 12
      const h = open * 8
      return `M 38 50 Q 50 ${y} 62 50 Q 50 ${y + h} 38 50`
    } else {
      // Fully open - larger oval
      return 'M 36 48 Q 50 68 64 48 Q 50 72 36 48'
    }
  }, [mouthOpen])

  // Eye expressions based on state
  const eyeExpression = useMemo(() => {
    const baseStyle = {
      leftEye: { cx: 40, cy: 38, rx: 9, ry: 11 },
      rightEye: { cx: 60, cy: 38, rx: 9, ry: 11 },
      pupilY: 38,
      pupilSize: 3.5,
      sparkle: true,
    }

    switch (externalState) {
      case 'thinking':
        return {
          ...baseStyle,
          leftEye: { cx: 40, cy: 37, rx: 8, ry: 10 },
          rightEye: { cx: 60, cy: 37, rx: 8, ry: 10 },
          pupilY: 35,
          pupilSize: 3,
          sparkle: false,
        }
      case 'listening':
        return {
          ...baseStyle,
          leftEye: { cx: 40, cy: 38, rx: 9.5, ry: 11.5 },
          rightEye: { cx: 60, cy: 38, rx: 9.5, ry: 11.5 },
          pupilY: 37,
          pupilSize: 4,
          sparkle: true,
        }
      case 'talking':
        return {
          ...baseStyle,
          leftEye: { cx: 40, cy: 38, rx: 9, ry: 11 },
          rightEye: { cx: 60, cy: 38, rx: 9, ry: 11 },
          pupilY: 38 + Math.sin(Date.now() * 0.005) * 2,
          pupilSize: 3.5,
          sparkle: true,
        }
      default:
        return baseStyle
    }
  }, [externalState])

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Multi-layer glow background */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer glow layer */}
        {qualityConfig.glowLayers >= 2 && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: size * 0.85,
              height: size * 0.85,
              background: `radial-gradient(circle, ${currentColors.glow}40 0%, transparent 70%)`,
            }}
            animate={{
              scale: 1 + breathingPhase * 0.1 + glowIntensity * 0.2,
              opacity: 0.4 + glowIntensity * 0.3,
            }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        )}

        {/* Inner glow layer */}
        <motion.div
          className="absolute rounded-full blur-xl"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            background: `radial-gradient(circle, ${currentColors.glow}80 0%, ${currentColors.primary}40 50%, transparent 70%)`,
            filter: `blur(${qualityConfig.shadowBlur}px)`,
          }}
          animate={{
            scale: 1 + glowIntensity * 0.15,
            opacity: 0.6 + glowIntensity * 0.4,
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />

        {/* Core glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 0.45,
            height: size * 0.45,
            background: `radial-gradient(circle, ${currentColors.glow}CC 0%, ${currentColors.primary}60 40%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          animate={{
            scale: 1 + glowIntensity * 0.1 + (externalState === 'thinking' ? Math.sin(Date.now() * 0.003) * 0.05 : 0),
          }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      </div>

      {/* Thinking particles */}
      {externalState === 'thinking' && qualityConfig.thinkingParticles > 0 && (
        <div className="absolute inset-0">
          {Array.from({ length: qualityConfig.thinkingParticles }).map((_, i) => {
            const angle = (i / qualityConfig.thinkingParticles) * Math.PI * 2 + orbitRotation * 0.01
            const radius = size * 0.4 + Math.sin(Date.now() * 0.002 + i) * 10
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius * 0.5

            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  background: currentColors.accent,
                  boxShadow: `0 0 ${8 + Math.sin(Date.now() * 0.003 + i) * 4}px ${currentColors.glow}`,
                }}
                animate={{
                  x,
                  y,
                  scale: 0.8 + Math.sin(Date.now() * 0.004 + i * 0.5) * 0.4,
                  opacity: 0.6 + Math.sin(Date.now() * 0.003 + i) * 0.4,
                }}
                transition={{ duration: 0 }}
              />
            )
          })}
        </div>
      )}

      {/* Main moon container with float and bounce */}
      <motion.div
        className="relative"
        animate={{
          y: floatOffset + bodyBounce,
          rotate: Math.sin(Date.now() * 0.0005) * 2,
        }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        style={{ transformOrigin: 'center' }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          <defs>
            {/* Premium moon body gradient - multi-stop for depth */}
            <radialGradient id="moon-body-gradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="25%" stopColor="#F8F6FF" stopOpacity="0.98" />
              <stop offset="50%" stopColor={currentColors.primary} stopOpacity="0.95" />
              <stop offset="75%" stopColor={currentColors.secondary} stopOpacity="0.92" />
              <stop offset="100%" stopColor="#9C8CB5" stopOpacity="0.9" />
            </radialGradient>

            {/* Inner glow for depth */}
            <radialGradient id="inner-depth-glow" cx="30%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            {/* Shadow gradient for 3D effect */}
            <linearGradient id="shadow-depth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4C1D95" stopOpacity="0" />
              <stop offset="60%" stopColor="#4C1D95" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#4C1D95" stopOpacity="0.15" />
            </linearGradient>

            {/* Eye inner glow */}
            <radialGradient id="eye-glow" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E0DBED" stopOpacity="0" />
            </radialGradient>

            {/* Pupil gradient */}
            <radialGradient id="pupil-gradient" cx="40%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#5B4B7B" />
              <stop offset="100%" stopColor="#2D1B4E" />
            </radialGradient>

            {/* Glass/jelly effect filter */}
            {quality !== 'low' && (
              <filter id="premium-glass" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                  result="goo"
                />
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
              </filter>
            )}

            {/* Soft shadow */}
            <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
              <feOffset dx="2" dy="4" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.2" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bloom effect for glow */}
            <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Crescent moon body - premium layered design */}
          <g filter={quality !== 'low' ? 'url(#soft-shadow)' : undefined}>
            {/* Outer glow layer for the moon */}
            <motion.path
              d="M 25 12
                 A 38 38 0 1 0 25 88
                 A 30 30 0 1 1 25 12
                 Z"
              fill={currentColors.glow}
              opacity={0.3}
              animate={{
                scale: 1 + breathingPhase * 0.02,
              }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              style={{ transformOrigin: '50px 50px' }}
            />

            {/* Main moon body with premium gradient */}
            <path
              d="M 25 12
                 A 38 38 0 1 0 25 88
                 A 30 30 0 1 1 25 12
                 Z"
              fill="url(#moon-body-gradient)"
              filter={quality !== 'low' ? 'url(#premium-glass)' : undefined}
            />

            {/* Inner depth glow overlay */}
            <path
              d="M 25 12
                 A 38 38 0 1 0 25 88
                 A 30 30 0 1 1 25 12
                 Z"
              fill="url(#inner-depth-glow)"
              style={{ mixBlendMode: 'soft-light' }}
            />

            {/* Shadow depth overlay */}
            <path
              d="M 25 12
                 A 38 38 0 1 0 25 88
                 A 30 30 0 1 1 25 12
                 Z"
              fill="url(#shadow-depth)"
              style={{ mixBlendMode: 'multiply' }}
            />
          </g>

          {/* Premium Eyes - larger and more expressive */}
          <g filter={quality !== 'low' ? 'url(#bloom)' : undefined}>
            {/* Left Eye */}
            <g>
              {/* Eye white/shape */}
              <ellipse
                cx={eyeExpression.leftEye.cx}
                cy={eyeExpression.leftEye.cy}
                rx={eyeExpression.leftEye.rx}
                ry={eyeExpression.leftEye.ry}
                fill="#FAF8FF"
                stroke="#E0DBED"
                strokeWidth="0.5"
              />

              {/* Eye inner glow */}
              <ellipse
                cx={eyeExpression.leftEye.cx}
                cy={eyeExpression.leftEye.cy}
                rx={eyeExpression.leftEye.rx * 0.8}
                ry={eyeExpression.leftEye.ry * 0.8}
                fill="url(#eye-glow)"
              />

              {/* Pupil */}
              <circle
                cx={eyeExpression.leftEye.cx}
                cy={eyeExpression.pupilY}
                r={eyeExpression.pupilSize}
                fill="url(#pupil-gradient)"
              />

              {/* Eye sparkle - premium reflection */}
              {eyeExpression.sparkle && quality !== 'low' && (
                <>
                  <circle cx={eyeExpression.leftEye.cx + 2.5} cy={eyeExpression.pupilY - 2.5} r="2" fill="white" opacity={0.9} />
                  <circle cx={eyeExpression.leftEye.cx + 3.5} cy={eyeExpression.pupilY - 3.5} r="1" fill="white" opacity={0.6} />
                </>
              )}
            </g>

            {/* Right Eye */}
            <g>
              {/* Eye white/shape */}
              <ellipse
                cx={eyeExpression.rightEye.cx}
                cy={eyeExpression.rightEye.cy}
                rx={eyeExpression.rightEye.rx}
                ry={eyeExpression.rightEye.ry}
                fill="#FAF8FF"
                stroke="#E0DBED"
                strokeWidth="0.5"
              />

              {/* Eye inner glow */}
              <ellipse
                cx={eyeExpression.rightEye.cx}
                cy={eyeExpression.rightEye.cy}
                rx={eyeExpression.rightEye.rx * 0.8}
                ry={eyeExpression.rightEye.ry * 0.8}
                fill="url(#eye-glow)"
              />

              {/* Pupil */}
              <circle
                cx={eyeExpression.rightEye.cx}
                cy={eyeExpression.pupilY}
                r={eyeExpression.pupilSize}
                fill="url(#pupil-gradient)"
              />

              {/* Eye sparkle - premium reflection */}
              {eyeExpression.sparkle && quality !== 'low' && (
                <>
                  <circle cx={eyeExpression.rightEye.cx + 2.5} cy={eyeExpression.pupilY - 2.5} r="2" fill="white" opacity={0.9} />
                  <circle cx={eyeExpression.rightEye.cx + 3.5} cy={eyeExpression.pupilY - 3.5} r="1" fill="white" opacity={0.6} />
                </>
              )}
            </g>
          </g>

          {/* Mouth - smooth talking animation */}
          <g filter={quality !== 'low' ? 'url(#bloom)' : undefined}>
            <motion.path
              d={mouthPath}
              stroke="#5B4B7B"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              animate={{
                strokeWidth: 1.5 + mouthOpen * 0.5,
              }}
              transition={{ duration: 0.1 }}
            />
          </g>

          {/* Subtle cheek blush for reactions */}
          {(externalReaction === 'happy' || externalReaction === 'greeting') && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
            >
              <ellipse cx="33" cy="44" rx="5" ry="3" fill="#FFD6E0" />
              <ellipse cx="67" cy="44" rx="5" ry="3" fill="#FFD6E0" />
            </motion.g>
          )}
        </svg>
      </motion.div>

      {/* Premium Orbit Ring - more prominent with glow */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: size * 0.95,
          height: size * 0.5,
          borderColor: currentColors.accent + '60',
          boxShadow: qualityConfig.orbitGlow
            ? `0 0 ${15 + glowIntensity * 10}px ${currentColors.glow}, inset 0 0 ${10 + glowIntensity * 5}px ${currentColors.glow}40`
            : 'none',
          rotateX: 70,
        }}
        animate={{
          rotateZ: orbitRotation,
          scale: 1 + glowIntensity * 0.05,
        }}
        transition={{ type: 'spring', stiffness: 30, damping: 20 }}
      />

      {/* Secondary orbit ring - with lag effect */}
      {quality !== 'low' && (
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: size * 0.8,
            height: size * 0.42,
            borderColor: currentColors.secondary + '40',
            boxShadow: `0 0 ${8}px ${currentColors.glow}30`,
            rotateX: 70,
          }}
          animate={{
            rotateZ: -orbitRotation * 0.7,
          }}
          transition={{ type: 'spring', stiffness: 25, damping: 25 }}
        />
      )}

      {/* Floating particles around the moon */}
      {qualityConfig.particles > 0 && (
        <div className="absolute inset-0">
          {Array.from({ length: qualityConfig.particles }).map((_, i) => {
            const angle = (i / qualityConfig.particles) * Math.PI * 2 + orbitRotation * 0.005
            const radius = size * 0.55 + Math.sin(Date.now() * 0.001 + i * 0.5) * 15
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius * 0.4
            const particleSize = 2 + Math.sin(i * 1.5) * 1.5
            const opacity = 0.4 + Math.sin(Date.now() * 0.002 + i) * 0.3

            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  width: particleSize,
                  height: particleSize,
                  background: `radial-gradient(circle, ${currentColors.accent} 0%, ${currentColors.glow} 50%, transparent 70%)`,
                  boxShadow: `0 0 ${particleSize * 2}px ${currentColors.glow}`,
                }}
                animate={{
                  x,
                  y,
                  opacity,
                  scale: 0.8 + Math.sin(Date.now() * 0.003 + i) * 0.4,
                }}
                transition={{ duration: 0 }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LunaAssistant
