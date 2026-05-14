/**
 * Luna Animation State Machine - Premium Edition
 * Smooth transitions with inertia, breathing, and natural motion
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LunaState, ReactionType, QualityLevel, LunaAnimationConfig } from './lunaConfig'
import { STATE_CONFIGS, QUALITY_PRESETS, REACTION_CONFIGS } from './lunaConfig'

interface UseLunaAnimationProps {
  initialState?: LunaState
  quality?: QualityLevel
  onStateChange?: (state: LunaState) => void
}

export const useLunaAnimation = ({
  initialState = 'idle',
  quality = 'high',
  onStateChange,
}: UseLunaAnimationProps = {}) => {
  const [currentState, setCurrentState] = useState<LunaState>(initialState)
  const [targetState, setTargetState] = useState<LunaState>(initialState)
  const [transitionProgress, setTransitionProgress] = useState(0)
  const [reactionType, setReactionType] = useState<ReactionType | null>(null)
  const [mouthOpen, setMouthOpen] = useState(0)

  // Physics-based animation values
  const physicsRef = useRef({
    floatY: 0,
    floatVelocity: 0,
    rotation: 0,
    rotationVelocity: 0,
    glowIntensity: 0.6,
    glowVelocity: 0,
    orbitRotation: 0,
    orbitVelocity: 0.001,
  })

  const blinkTimeoutRef = useRef<number>()
  const reactionTimeoutRef = useRef<number>()

  // Smooth easing function (ease-out cubic)
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }

  // Smooth step function for softer transitions
  const smoothStep = (t: number): number => {
    return t * t * (3 - 2 * t)
  }

  // Damped spring physics for inertia
  const updatePhysics = (
    current: number,
    target: number,
    velocity: number,
    stiffness: number = 0.08,
    damping: number = 0.85
  ): { value: number; newVelocity: number } => {
    const force = (target - current) * stiffness
    const newVelocity = (velocity + force) * damping
    const newValue = current + newVelocity
    return { value: newValue, newVelocity }
  }

  // Schedule natural blinking with randomness
  const scheduleBlink = useCallback(() => {
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current)
    }

    // Base interval varies by state
    const baseIntervals: Record<LunaState, number> = {
      idle: 3500,
      listening: 4500,
      thinking: 5000,
      talking: 3000,
      reaction: 2000,
    }

    const baseInterval = baseIntervals[currentState]
    // Add significant randomness for natural feel
    const randomVariation = Math.random() * 2500 - 1000
    const interval = Math.max(1500, baseInterval + randomVariation)

    blinkTimeoutRef.current = window.setTimeout(() => {
      // Blink animation will be handled in component
      scheduleBlink()
    }, interval)
  }, [currentState])

  // Change state with smooth transition
  const changeState = useCallback((newState: LunaState) => {
    if (newState === currentState) return

    setTargetState(newState)
    setTransitionProgress(0)

    if (onStateChange) {
      onStateChange(newState)
    }

    // Smooth transition over time
    let startTime: number | null = null
    const duration = 600 // ms for smooth transition

    const animateTransition = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(1, elapsed / duration)

      setTransitionProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(animateTransition)
      } else {
        setCurrentState(newState)
      }
    }

    requestAnimationFrame(animateTransition)
  }, [currentState, onStateChange])

  // Trigger reaction
  const triggerReaction = useCallback((type: ReactionType) => {
    setReactionType(type)
    setCurrentState('reaction')
    setTargetState('reaction')
    setTransitionProgress(0)

    const config = REACTION_CONFIGS[type]
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current)
    }

    reactionTimeoutRef.current = window.setTimeout(() => {
      changeState('idle')
      setReactionType(null)
    }, config.duration)
  }, [changeState])

  // Animation loop for smooth continuous motion
  useEffect(() => {
    let raf: number
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      const physics = physicsRef.current

      // Get state-specific targets
      const stateConfig = STATE_CONFIGS[targetState]
      const floatTarget = Math.sin(currentTime * (stateConfig?.floatSpeed || 0.001)) * (stateConfig?.floatAmplitude || 8)
      const glowTarget = 0.5 + Math.sin(currentTime * (stateConfig?.glowPulseSpeed || 0.002)) * 0.2

      // Update physics with inertia
      const floatPhysics = updatePhysics(
        physics.floatY,
        floatTarget,
        physics.floatVelocity,
        0.06, // Soft stiffness for floating
        0.92  // High damping for smooth motion
      )

      const glowPhysics = updatePhysics(
        physics.glowIntensity,
        glowTarget,
        physics.glowVelocity,
        0.08,
        0.88
      )

      // Orbit with continuous rotation
      physics.orbitRotation += physics.orbitVelocity * deltaTime * 60

      // Subtle rotation
      physics.rotation = Math.sin(currentTime * 0.0005) * 2

      // Update ref
      physicsRef.current = {
        ...physics,
        floatY: floatPhysics.value,
        floatVelocity: floatPhysics.newVelocity,
        glowIntensity: glowPhysics.value,
        glowVelocity: glowPhysics.newVelocity,
      }

      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
    }
  }, [targetState])

  // Start blinking
  useEffect(() => {
    scheduleBlink()
    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current)
      }
    }
  }, [scheduleBlink])

  // Cleanup
  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current)
      }
    }
  }, [])

  return {
    state: currentState,
    targetState,
    transitionProgress,
    reactionType,
    mouthOpen,
    physics: physicsRef.current,
    changeState,
    triggerReaction,
    setMouthOpen,
  }
}

export default useLunaAnimation
