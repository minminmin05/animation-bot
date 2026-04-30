import React, { useState } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'

const AIChatAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Hello! I am your AI Assistant. I can help you search for information about students, classes, or policies. (RAG system coming soon!)'
    }
  ])
  const [input, setInput] = useState('')

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessage = {
      id: Date.now(),
      type: 'user',
      text: input
    }

    setMessages([...messages, newMessage])
    setInput('')

    // Placeholder for AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: 'This is a placeholder response. Once RAG is connected, I will search the database to answer your question!'
      }])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto gap-6 lg:flex-row">
      
      {/* Animation/Avatar Placeholder Area */}
      <div className="w-full lg:w-1/3 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-sm">
        
        {/* Animated Background Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Space for actual 3D animation or Character */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-48 h-48 border-4 border-dashed border-indigo-300 dark:border-indigo-700 rounded-full flex items-center justify-center mb-6 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
            <div className="text-indigo-400 dark:text-indigo-500 flex flex-col items-center">
              <Bot size={48} className="mb-2 opacity-50" />
              <span className="text-sm font-medium opacity-70">Animation Space</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            AI Assistant <Sparkles className="w-5 h-5 text-yellow-500" />
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-[250px]">
            Ready to integrate with your RAG Vector Database
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-full lg:w-2/3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="font-semibold text-gray-800 dark:text-white">Knowledge Base Chat</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Ask me anything about the school data</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}

              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.type === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>

              {msg.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-full py-3 pl-6 pr-14 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AIChatAssistant
