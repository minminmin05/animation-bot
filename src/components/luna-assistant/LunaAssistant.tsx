/**
 * Luna Assistant - Spherical Moon Knowledge Spirit
 * Based on reference design: floating orb with crescent moon shell and dark face core
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useRef, useEffect, useState } from 'react'
import { type LunaState, type ReactionType, type QualityLevel } from './lunaConfig'

interface LunaAssistantProps {
  state?: LunaState
  reaction?: ReactionType
  quality?: QualityLevel
  size?: number
  mouthOpen?: number
  onStateChange?: (state: LunaState) => void
  className?: string
}

// Color palette based on reference
const LUNA_COLORS = {
  // Orb body gradient colors
  orbInner: '#FFFFFF',
  orbMid: '#F0EBF8',
  orbOuter: '#D4C8E8',
  orbShadow: '#9B8CB5',

  // Face core
  faceCore: '#1A1430',
  faceRim: '#2D2447',

  // Eyes
  eyeGlow: '#E0D4FF',
  eyeInner: '#C4B5FD',
  eyeAccent: '#A78BFA',

  // Crescent shell
  crescentInner: '#FFFFFF',
  crescentMid: '#E8E4F0',
  crescentOuter: '#C4B5FD',

  // Glow effects
  ambientGlow: '#E9D5FF',
  orbitRing: '#DDD6FE',

  // Reaction colors
  reactions: {
    happy: { glow: '#FFE066', accent: '#FFD700' },
    success: { glow: '#66D9FF', accent: '#00B4D8' },
    confused: { glow: '#FFB347', accent: '#FF9500' },
    apology: { glow: '#FF8FA3', accent: '#FF4D6D' },
    greeting: { glow: '#C4B5FD', accent: '#A78BFA' },
  },
} as const

export const LunaAssistant = ({
  state: externalState = 'idle',
  reaction: externalReaction,
  quality = 'high',
  size = 280,
  mouthOpen: externalMouthOpen = 0,
  onStateChange,
  className = '',
}: LunaAssistantProps) => {
  const [breathingPhase, setBreathingPhase] = useState(0)
  const [orbitRotation, setOrbitRotation] = useState(0)
  const [floatOffset, setFloatOffset] = useState(0)
  const [crescentRotation, setCrescentRotation] = useState(0)

  // Breathing and floating animation
  useEffect(() => {
    let raf: number
    const startTime = performance.now()

    const animate = (time: number) => {
      const elapsed = time - startTime

      // Breathing cycle (4 seconds)
      setBreathingPhase(Math.sin(elapsed * 0.0015) * 0.5 + 0.5)

      // Floating with dual sine waves for organic motion
      const floatY = Math.sin(elapsed * 0.0008) * 10 + Math.sin(elapsed * 0.0013) * 4
      setFloatOffset(floatY)

      // Orbit rotation
      setOrbitRotation(elapsed * 0.015)

      // Crescent moon slow rotation
      setCrescentRotation(Math.sin(elapsed * 0.0003) * 8)

      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  // State-based intensity
  const stateIntensity = useMemo(() => {
    switch (externalState) {
      case 'thinking': return 1.3
      case 'listening': return 1.15
      case 'talking': return externalMouthOpen * 0.3 + 0.9
      case 'reaction': return 1.4
      default: return 0.85
    }
  }, [externalState, externalMouthOpen])

  // Glow intensity
  const glowIntensity = useMemo(() => {
    const base = 0.5 + breathingPhase * 0.25
    const boost = (externalState === 'talking' ? externalMouthOpen * 0.25 : 0)
    return Math.min(1, base + boost)
  }, [breathingPhase, externalState, externalMouthOpen])

  // Quality configuration
  const qualityConfig = useMemo(() => {
    switch (quality) {
      case 'high':
        return {
          particles: 20,
          glowLayers: 3,
          shadowBlur: 25,
          orbitGlow: true,
          thinkingParticles: 8,
          hasReflection: true,
          hasInnerGlow: true,
        }
      case 'medium':
        return {
          particles: 10,
          glowLayers: 2,
          shadowBlur: 12,
          orbitGlow: true,
          thinkingParticles: 4,
          hasReflection: true,
          hasInnerGlow: true,
        }
      case 'low':
        return {
          particles: 0,
          glowLayers: 1,
          shadowBlur: 6,
          orbitGlow: false,
          thinkingParticles: 0,
          hasReflection: false,
          hasInnerGlow: false,
        }
    }
  }, [quality])

  // Reaction colors
  const reactionColors = useMemo(() => {
    if (externalState !== 'reaction' || !externalReaction) return null
    return LUNA_COLORS.reactions[externalReaction] || null
  }, [externalState, externalReaction])

  const accentColor = reactionColors?.accent || LUNA_COLORS.eyeAccent
  const glowColor = reactionColors?.glow || LUNA_COLORS.ambientGlow

  // Mouth shape - minimal and soft
  const mouthPath = useMemo(() => {
    const open = Math.max(0, Math.min(1, externalMouthOpen))
    if (open < 0.2) {
      return 'M 46 56 Q 50 57 54 56'
    } else if (open < 0.5) {
      const y = 56 + open * 6
      return `M 44 56 Q 50 ${y} 56 56`
    } else if (open < 0.8) {
      const y = 59 + open * 4
      return `M 43 56 Q 50 ${y} 57 56`
    } else {
      return 'M 42 55 Q 50 66 58 55'
    }
  }, [externalMouthOpen])

  // Eye expression based on state
  const eyeConfig = useMemo(() => {
    const base = {
      width: 14,
      height: 10,
      pupilSize: 3,
      glowSize: 8,
    }

    switch (externalState) {
      case 'thinking':
        return { ...base, width: 12, height: 9, pupilSize: 2.5 }
      case 'listening':
        return { ...base, width: 15, height: 11, pupilSize: 3.5 }
      case 'talking':
        return { ...base, height: 10 + Math.sin(Date.now() * 0.01) * 1 }
      default:
        return base
    }
  }, [externalState])

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Multi-layer ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer glow layer */}
        {qualityConfig.glowLayers >= 2 && (
          <motion.div
            className="absolute rounded-full blur-2xl"
            style={{
              width: size * 0.9,
              height: size * 0.9,
              background: `radial-gradient(circle, ${glowColor}50 0%, ${glowColor}20 40%, transparent 70%)`,
            }}
            animate={{
              scale: 1 + breathingPhase * 0.08 + glowIntensity * 0.15,
              opacity: 0.5 + glowIntensity * 0.3,
            }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        )}

        {/* Mid glow layer */}
        <motion.div
          className="absolute rounded-full blur-xl"
          style={{
            width: size * 0.65,
            height: size * 0.65,
            background: `radial-gradient(circle, ${glowColor}80 0%, ${accentColor}40 50%, transparent 70%)`,
            filter: `blur(${qualityConfig.shadowBlur}px)`,
          }}
          animate={{
            scale: 1 + glowIntensity * 0.12,
            opacity: 0.6 + glowIntensity * 0.4,
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />

        {/* Core glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            background: `radial-gradient(circle, ${glowColor}CC 0%, ${accentColor}60 40%, transparent 70%)`,
          }}
          animate={{
            scale: 1 + glowIntensity * 0.08,
          }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      </div>

      {/* Thinking particles - orbiting around */}
      {externalState === 'thinking' && qualityConfig.thinkingParticles > 0 && (
        <div className="absolute inset-0">
          {Array.from({ length: qualityConfig.thinkingParticles }).map((_, i) => {
            const angle = (i / qualityConfig.thinkingParticles) * Math.PI * 2 + orbitRotation * 0.02
            const radius = size * 0.38 + Math.sin(Date.now() * 0.003 + i) * 8
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius * 0.5

            return (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  background: accentColor,
                  boxShadow: `0 0 ${8 + Math.sin(Date.now() * 0.004 + i) * 4}px ${glowColor}`,
                }}
                animate={{
                  x,
                  y,
                  scale: 0.6 + Math.sin(Date.now() * 0.005 + i * 0.5) * 0.4,
                  opacity: 0.5 + Math.sin(Date.now() * 0.003 + i) * 0.5,
                }}
                transition={{ duration: 0 }}
              />
            )
          })}
        </div>
      )}

      {/* Main Luna container with float */}
      <motion.div
        className="relative"
        animate={{
          y: floatOffset,
        }}
        transition={{ type: 'spring', stiffness: 40, damping: 20 }}
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
            {/* Spherical orb body gradient */}
            <radialGradient id="orb-sphere" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor={LUNA_COLORS.orbInner} />
              <stop offset="40%" stopColor={LUNA_COLORS.orbMid} />
              <stop offset="100%" stopColor={LUNA_COLORS.orbOuter} />
            </radialGradient>

            {/* Orb depth/shadow gradient */}
            <radialGradient id="orb-depth" cx="60%" cy="60%" r="50%">
              <stop offset="0%" stopColor={LUNA_COLORS.orbShadow} stopOpacity="0" />
              <stop offset="100%" stopColor={LUNA_COLORS.orbShadow} stopOpacity="0.3" />
            </radialGradient>

            {/* Crescent moon gradient */}
            <linearGradient id="crescent-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={LUNA_COLORS.crescentInner} />
              <stop offset="50%" stopColor={LUNA_COLORS.crescentMid} />
              <stop offset="100%" stopColor={LUNA_COLORS.crescentOuter} />
            </linearGradient>

            {/* Face core gradient */}
            <radialGradient id="face-core-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor={LUNA_COLORS.faceCore} />
              <stop offset="100%" stopColor={LUNA_COLORS.faceRim} />
            </radialGradient>

            {/* Eye glow */}
            <radialGradient id="eye-glow-gradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={LUNA_COLORS.eyeGlow} stopOpacity="0.9" />
              <stop offset="100%" stopColor={LUNA_COLORS.eyeInner} stopOpacity="0" />
            </radialGradient>

            {/* Premium glass/gloss effect */}
            {quality !== 'low' && (
              <filter id="glass-effect" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                  result="goo"
                />
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
              </filter>
            )}

            {/* Soft shadow */}
            <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="3" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.25" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Bloom filter */}
            <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* SPHERICAL ORB BODY */}
          <g filter={quality !== 'low' ? 'url(#soft-shadow)' : undefined}>
            {/* Main sphere */}
            <circle cx="50" cy="50" r="38" fill="url(#orb-sphere)" />

            {/* Depth overlay */}
            <circle cx="50" cy="50" r="38" fill="url(#orb-depth)" style={{ mixBlendMode: 'multiply' }} />

            {/* Glossy highlight on top */}
            {qualityConfig.hasInnerGlow && (
              <ellipse
                cx="38"
                cy="32"
                rx="18"
                ry="12"
                fill="white"
                opacity={0.15 + breathingPhase * 0.1}
              />
            )}
          </g>

          {/* CRESCENT MOON SHELL */}
          <motion.g
            animate={{ rotate: crescentRotation }}
            transition={{ type: 'spring', stiffness: 20, damping: 30 }}
            style={{ transformOrigin: '50px 50px' }}
          >
            {/* Outer crescent glow */}
            {qualityConfig.orbitGlow && (
              <path
                d="M 20 15
                   Q 50 -5 80 15
                   Q 85 25 85 40
                   Q 70 30 50 30
                   Q 30 30 15 45
                   Q 10 30 20 15
                   Z"
                fill={accentColor}
                opacity="0.15"
                filter="url(#bloom)"
              />
            )}

            {/* Main crescent shape */}
            <path
              d="M 18 14
                 Q 50 -8 82 14
                 Q 88 24 88 42
                 Q 72 32 50 32
                 Q 28 32 12 48
                 Q 8 30 18 14
                 Z"
              fill="url(#crescent-gradient)"
              filter={quality !== 'low' ? 'url(#glass-effect)' : undefined}
              style={{
                filter: `drop-shadow(0 2px 4px ${LUNA_COLORS.orbShadow}40)`,
              }}
            />

            {/* Crescent inner highlight */}
            <path
              d="M 18 14
                 Q 50 -8 82 14
                 Q 88 24 88 42
                 Q 72 32 50 32
                 Q 28 32 12 48
                 Q 8 30 18 14
                 Z"
              fill="white"
              opacity="0.2"
              style={{ mixBlendMode: 'soft-light' }}
            />
          </motion.g>

          {/* DARK FACE CORE */}
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="url(#face-core-gradient)"
          />

          {/* GLOWING EYES */}
          <g filter={qualityConfig.orbitGlow ? 'url(#bloom)' : undefined}>
            {/* Left eye */}
            <g>
              {/* Eye glow */}
              <ellipse
                cx="42"
                cy="48"
                rx={eyeConfig.width / 2}
                ry={eyeConfig.height / 2}
                fill="url(#eye-glow-gradient)"
              />

              {/* Eye core */}
              <ellipse
                cx="42"
                cy="48"
                rx={eyeConfig.width / 2 - 1}
                ry={eyeConfig.height / 2 - 1}
                fill={LUNA_COLORS.eyeInner}
              />

              {/* Eye accent highlight */}
              {qualityConfig.hasReflection && (
                <ellipse
                  cx="40"
                  cy="46"
                  rx="3"
                  ry="2"
                  fill="white"
                  opacity="0.7"
                />
              )}
            </g>

            {/* Right eye */}
            <g>
              {/* Eye glow */}
              <ellipse
                cx="58"
                cy="48"
                rx={eyeConfig.width / 2}
                ry={eyeConfig.height / 2}
                fill="url(#eye-glow-gradient)"
              />

              {/* Eye core */}
              <ellipse
                cx="58"
                cy="48"
                rx={eyeConfig.width / 2 - 1}
                ry={eyeConfig.height / 2 - 1}
                fill={LUNA_COLORS.eyeInner}
              />

              {/* Eye accent highlight */}
              {qualityConfig.hasReflection && (
                <ellipse
                  cx="56"
                  cy="46"
                  rx="3"
                  ry="2"
                  fill="white"
                  opacity="0.7"
                />
              )}
            </g>
          </g>

          {/* MINIMAL MOUTH */}
          <motion.path
            d={mouthPath}
            stroke={LUNA_COLORS.eyeInner}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            animate={{
              strokeWidth: 1.5 + externalMouthOpen * 0.5,
            }}
            transition={{ duration: 0.08 }}
          />
        </svg>
      </motion.div>

      {/* GLOWING ORBIT RING */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: size * 0.92,
          height: size * 0.48,
          borderColor: accentColor + '50',
          boxShadow: qualityConfig.orbitGlow
            ? `0 0 ${12 + glowIntensity * 8}px ${glowColor}60, inset 0 0 ${8 + glowIntensity * 4}px ${accentColor}30`
            : 'none',
          rotateX: 70,
        }}
        animate={{
          rotateZ: orbitRotation,
          scale: 1 + glowIntensity * 0.03,
        }}
        transition={{ type: 'spring', stiffness: 25, damping: 20 }}
      />

      {/* Secondary orbit ring */}
      {qualityConfig.orbitGlow && (
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: size * 0.78,
            height: size * 0.4,
            borderColor: accentColor + '25',
            rotateX: 70,
          }}
          animate={{
            rotateZ: -orbitRotation * 0.65,
          }}
          transition={{ type: 'spring', stiffness: 20, damping: 25 }}
        />
      )}

      {/* Floating stars/particles */}
      {qualityConfig.particles > 0 && (
        <div className="absolute inset-0">
          {Array.from({ length: qualityConfig.particles }).map((_, i) => {
            const angle = (i / qualityConfig.particles) * Math.PI * 2 + orbitRotation * 0.008
            const radius = size * 0.52 + Math.sin(Date.now() * 0.0012 + i * 0.4) * 12
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius * 0.38
            const starSize = 1.5 + Math.sin(i * 0.7) * 1
            const opacity = 0.3 + Math.sin(Date.now() * 0.0025 + i * 0.6) * 0.4 + glowIntensity * 0.3

            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  width: starSize,
                  height: starSize,
                  background: `radial-gradient(circle, ${accentColor} 0%, ${glowColor} 50%, transparent 70%)`,
                  boxShadow: `0 0 ${starSize * 3}px ${glowColor}80`,
                }}
                animate={{
                  x,
                  y,
                  opacity,
                  scale: 0.7 + Math.sin(Date.now() * 0.003 + i * 0.5) * 0.5,
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
