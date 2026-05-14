/**
 * Lumaid Chatbot Animation System
 * Designed for RAG-based school chatbot with warm, approachable feel
 */

// ============================================================================
// ANIMATION TIMING & EASING
// ============================================================================

export const animationTiming = {
  // Message entry - snappy but smooth
  messageIn: {
    duration: 350,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)' // ease-out-circ
  },

  // Message exit - quick dismiss
  messageOut: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 1, 1)' // ease-in-quad
  },

  // Typing indicator - gentle bounce
  typingBounce: {
    duration: 1400,
    easing: 'ease-in-out'
  },

  // RAG retrieval - steady, purposeful
  retrieval: {
    duration: 800,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  },

  // Source card - smooth reveal
  sourceReveal: {
    duration: 400,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
  },

  // Success feedback - celebration
  success: {
    duration: 600,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' // slight bounce
  },

  // Error feedback - gentle shake
  error: {
    duration: 400,
    easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)'
  },

  // Stagger delays for list items
  stagger: {
    base: 50,
    step: 75
  }
}

// ============================================================================
// CSS ANIMATIONS (add to index.css)
// ============================================================================

export const chatCSSAnimations = `
/* Message Entry Animation */
@keyframes messageSlideIn {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-message-in {
  animation: messageSlideIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Message Exit Animation */
@keyframes messageSlideOut {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-20px);
  }
}

.animate-message-out {
  animation: messageSlideOut 200ms cubic-bezier(0.4, 0, 1, 1) forwards;
}

/* Typing Indicator - Gentle Bounce */
@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

.typing-dot {
  animation: typingBounce 1400ms ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 160ms;
}

.typing-dot:nth-child(3) {
  animation-delay: 320ms;
}

/* RAG Retrieval Pulse */
@keyframes retrievalPulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.animate-retrieval {
  animation: retrievalPulse 800ms ease-in-out infinite;
}

/* Source Card Reveal */
@keyframes sourceReveal {
  0% {
    opacity: 0;
    transform: translateY(-4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-source-reveal {
  animation: sourceReveal 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Success Checkmark */
@keyframes successCheck {
  0% {
    transform: scale(0) rotate(45deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(45deg);
  }
  100% {
    transform: scale(1) rotate(45deg);
    opacity: 1;
  }
}

.animate-success {
  animation: successCheck 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* Error Shake */
@keyframes errorShake {
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-4px);
  }
  40%, 80% {
    transform: translateX(4px);
  }
}

.animate-error {
  animation: errorShake 400ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

/* Thinking/Processing - Subtle rotation */
@keyframes thinkingRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-thinking {
  animation: thinkingRotate 2000ms linear infinite;
}

/* Source Highlight - Gentle glow */
@keyframes sourceGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(224, 122, 95, 0);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(224, 122, 95, 0);
  }
}

.source-highlight {
  animation: sourceGlow 2s ease-in-out;
}

/* Progress Bar - Smooth fill */
@keyframes progressFill {
  from {
    width: 0%;
  }
}

.animate-progress {
  animation: progressFill var(--duration, 1000ms) ease-out forwards;
}

/* Fade In Stagger for lists */
@keyframes fadeInStagger {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stagger-item {
  opacity: 0;
  animation: fadeInStagger 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
`

// ============================================================================
// TYPING INDICATOR COMPONENT
// ============================================================================

export const TypingIndicator = ({ variant = 'default' }) => {
  const variants = {
    default: 'bg-text-muted',
    accent: 'bg-accent'
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex gap-1">
        <span className={`typing-dot w-2 h-2 rounded-full ${variants[variant]}`} />
        <span className={`typing-dot w-2 h-2 rounded-full ${variants[variant]}`} />
        <span className={`typing-dot w-2 h-2 rounded-full ${variants[variant]}`} />
      </div>
      <span className="text-xs text-text-muted ml-1">thinking</span>
    </div>
  )
}

// ============================================================================
// RAG RETRIEVAL STATES
// ============================================================================

const RetrievalStates = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  RETRIEVING: 'retrieving',
  SYNTHESIZING: 'synthesizing',
  COMPLETE: 'complete',
  ERROR: 'error'
}

export const RetrievalIndicator = ({ state }) => {
  const stateConfig = {
    [RetrievalStates.IDLE]: {
      icon: null,
      text: '',
      color: 'text-text-muted'
    },
    [RetrievalStates.SEARCHING]: {
      icon: '🔍',
      text: 'Searching knowledge base...',
      color: 'text-navy',
      anim: 'animate-retrieval'
    },
    [RetrievalStates.RETRIEVING]: {
      icon: '📚',
      text: 'Finding relevant sources...',
      color: 'text-accent',
      anim: 'animate-retrieval'
    },
    [RetrievalStates.SYNTHESIZING]: {
      icon: '✨',
      text: 'Synthesizing answer...',
      color: 'text-sage',
      anim: 'animate-retrieval'
    },
    [RetrievalStates.COMPLETE]: {
      icon: '✓',
      text: '',
      color: 'text-sage',
      anim: 'animate-success'
    },
    [RetrievalStates.ERROR]: {
      icon: '⚠️',
      text: 'Something went wrong',
      color: 'text-coral',
      anim: 'animate-error'
    }
  }

  const config = stateConfig[state] || stateConfig[RetrievalStates.IDLE]

  if (state === RetrievalStates.IDLE) return null

  return (
    <div className={`flex items-center gap-2 px-4 py-3 text-sm ${config.color} ${config.anim || ''}`}>
      {config.icon && <span className="text-base">{config.icon}</span>}
      <span>{config.text}</span>
    </div>
  )
}

// ============================================================================
// SOURCE CARD COMPONENT WITH ANIMATIONS
// ============================================================================

export const SourceCard = ({ source, index, delay = 0 }) => {
  return (
    <div
      className="source-card animate-source-reveal bg-cream/50 rounded-xl p-3 hover:bg-cream transition-colors cursor-pointer group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Source Icon */}
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent/10 transition-colors">
          <span className="text-sm">📄</span>
        </div>

        {/* Source Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-navy text-sm truncate">
            {source.title || 'Document Source'}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {source.type || 'Document'} • Relevance: {Math.round(source.relevance || 0.85 * 100)}%
          </p>
        </div>

        {/* Chevron */}
        <svg
          className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

// ============================================================================
// MESSAGE BUBBLE WITH ANIMATIONS
// ============================================================================

export const ChatMessage = ({ message, isUser, delay = 0 }) => {
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-message-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-white text-navy border border-cream-dark rounded-bl-sm'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>

        {/* Sources for bot messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-cream-dark/50">
            <p className="text-xs text-text-muted mb-2">Sources</p>
            <div className="space-y-2">
              {message.sources.map((source, i) => (
                <SourceCard key={i} source={source} index={i} delay={i * 100} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs mt-2 ${
            isUser ? 'text-white/70' : 'text-text-muted'
          }`}
        >
          {message.timestamp}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// PROGRESS INDICATOR FOR RAG PROCESS
// ============================================================================

export const RetrievalProgress = ({ steps, currentStep }) => {
  const stepLabels = {
    searching: '🔍 Searching',
    retrieving: '📚 Retrieving',
    ranking: '📊 Ranking',
    synthesizing: '✨ Synthesizing'
  }

  const stepKeys = Object.keys(stepLabels)
  const currentIndex = stepKeys.indexOf(currentStep)
  const progress = ((currentIndex + 1) / stepKeys.length) * 100

  return (
    <div className="px-4 py-3">
      {/* Progress Bar */}
      <div className="h-1 bg-cream-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-coral-light rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between mt-3">
        {stepKeys.map((step, i) => {
          const isComplete = i < currentIndex
          const isCurrent = i === currentIndex
          const isPending = i > currentIndex

          return (
            <div
              key={step}
              className={`flex flex-col items-center gap-1 ${
                isCurrent ? 'animate-retrieval' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isComplete
                    ? 'bg-sage text-white'
                    : isCurrent
                    ? 'bg-accent text-white'
                    : 'bg-cream text-text-muted'
                }`}
              >
                {isComplete ? '✓' : stepLabels[step]?.[0]}
              </div>
              <span
                className={`text-[10px] ${
                  isCurrent ? 'text-navy font-medium' : 'text-text-muted'
                }`}
              >
                {stepLabels[step]?.slice(2)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// FEEDBACK ANIMATIONS
// ============================================================================

export const FeedbackIcon = ({ type }) => {
  const icons = {
    success: (
      <div className="w-8 h-8 bg-sage/20 rounded-full flex items-center justify-center animate-success">
        <svg className="w-5 h-5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    error: (
      <div className="w-8 h-8 bg-coral/10 rounded-full flex items-center justify-center animate-error">
        <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    warning: (
      <div className="w-8 h-8 bg-gold/10 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    info: (
      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    )
  }

  return icons[type] || icons.info
}

// ============================================================================
// SUGGESTION CHIPS ANIMATION
// ============================================================================

export const SuggestionChip = ({ text, onClick, index }) => {
  return (
    <button
      onClick={onClick}
      className="stagger-item px-4 py-2 bg-white border border-cream-dark rounded-full text-sm text-navy hover:bg-cream hover:border-accent/30 hover:text-accent transition-all duration-200 text-left"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <span className="flex items-center gap-2">
        <span className="text-accent">💡</span>
        {text}
      </span>
    </button>
  )
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export {
  RetrievalStates,
  chatCSSAnimations
}

export default {
  TypingIndicator,
  RetrievalIndicator,
  SourceCard,
  ChatMessage,
  RetrievalProgress,
  FeedbackIcon,
  SuggestionChip,
  animationTiming,
  RetrievalStates
}
