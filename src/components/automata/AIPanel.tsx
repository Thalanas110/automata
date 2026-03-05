import { useState, useRef, useEffect } from 'react'
import type { AIMessage, AutomataGraph } from '@/lib/automata/types'
import { groqChatFn } from '@/server/functions/groq'

interface AIPanelProps {
  graph: AutomataGraph
  onApplyMachine: (graph: AutomataGraph) => void
  onClose?: () => void
}

const QUICK_PROMPTS = [
  'DFA that accepts strings with even number of 0s',
  'NFA for strings ending in "ab"',
  'PDA for balanced parentheses',
  'TM that copies a string',
  'Explain this machine',
  'Find missing transitions',
]

export function AIPanel({ graph, onApplyMachine, onClose }: AIPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        "Hello! I'm your automata theory assistant. I can help you with tasks **within this application**:\n\n• **Generate** automata from natural language descriptions\n• **Explain** machine behavior and accepted languages\n• **Debug** rejected inputs and suggest fixes\n• **Suggest** missing transitions\n\nNote: I only assist with automata theory and this application's features. Try a quick prompt below!",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingMachine, setPendingMachine] = useState<AutomataGraph | null>(
    null,
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function buildContextMessage(): string {
    if (graph.states.length === 0) return ''
    const stateList = graph.states
      .map(
        (s) =>
          `${s.label}${s.isStart ? '(start)' : ''}${s.isAccept ? '(accept)' : ''}`,
      )
      .join(', ')
    const transList = graph.transitions
      .map((t) => {
        const from = graph.states.find((s) => s.id === t.from)?.label ?? t.from
        const to = graph.states.find((s) => s.id === t.to)?.label ?? t.to
        return `${from}--[${t.label}]-->${to}`
      })
      .join(', ')
    return `\n\n[Current machine context: ${graph.type} "${graph.name}" | States: ${stateList} | Transitions: ${transList} | Alphabet: ${graph.alphabet.join(',')}]`
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text + buildContextMessage(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages
        .filter((m) => m.id !== '0')
        .map((m) => ({ role: m.role, content: m.content }))

      const result = await groqChatFn({
        data: {
          messages: [...history, { role: 'user', content: userMsg.content }],
        },
      })

      const content = result.content

      // Try to extract JSON machine
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          if (parsed.states && parsed.transitions && parsed.type) {
            const newGraph: AutomataGraph = {
              id: crypto.randomUUID(),
              name: parsed.name ?? 'AI Generated',
              type: parsed.type,
              states: parsed.states.map(
                (s: {
                  id: string
                  label: string
                  x: number
                  y: number
                  isStart: boolean
                  isAccept: boolean
                }) => ({
                  ...s,
                  id: s.id ?? crypto.randomUUID(),
                }),
              ),
              transitions: parsed.transitions.map(
                (t: {
                  id: string
                  from: string
                  to: string
                  label: string
                }) => ({
                  ...t,
                  id: t.id ?? crypto.randomUUID(),
                }),
              ),
              alphabet: parsed.alphabet ?? [],
              stackAlphabet: parsed.stackAlphabet,
              tapeAlphabet: parsed.tapeAlphabet,
              blankSymbol: parsed.blankSymbol,
            }
            setPendingMachine(newGraph)
          }
        } catch {
          // Not a valid machine JSON, ignore
        }
      }

      const assistantMsg: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errMsg: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ Error: ${err instanceof Error ? err.message : 'Failed to connect to AI. Please check your GROQ_API_KEY configuration.'}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }

  function applyPendingMachine() {
    if (pendingMachine) {
      onApplyMachine(pendingMachine)
      setPendingMachine(null)
    }
  }

  function renderContent(content: string) {
    // Simple markdown-like rendering
    const lines = content.split('\n')
    return lines.map((line, i) => {
      if (line.startsWith('```')) {
        return null
      }
      // Bold
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={i} className={`${i > 0 && lines[i - 1] === '' ? 'mt-2' : ''}`}>
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="text-white">
                {part}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </p>
      )
    })
  }

  return (
    <div className="w-80 bg-[#0e0f11] border-l border-[#1e2028] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1e2028] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
          AI Assistant
        </span>
        <span className="ml-auto text-[9px] font-mono text-gray-600">
          Groq · LLaMA 3.3
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="xl:hidden ml-2 text-gray-500 hover:text-gray-200 text-sm leading-none px-1"
            aria-label="Close AI panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-xs font-mono leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30'
                  : 'bg-[#1a1b1e] text-gray-300 border border-[#2d3748]'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-0.5">{renderContent(msg.content)}</div>
              ) : (
                // Strip context from display
                msg.content.split('\n\n[Current machine context')[0]
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1b1e] border border-[#2d3748] rounded-lg px-3 py-2">
              <div className="flex gap-1 items-center">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pending machine apply */}
        {pendingMachine && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
              Machine Ready
            </div>
            <div className="text-xs text-gray-300 font-mono mb-2">
              {pendingMachine.type}: &quot;{pendingMachine.name}&quot; (
              {pendingMachine.states.length} states)
            </div>
            <div className="flex gap-2">
              <button
                onClick={applyPendingMachine}
                className="flex-1 py-1 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 transition-colors"
              >
                ✓ Apply to Canvas
              </button>
              <button
                onClick={() => setPendingMachine(null)}
                className="px-2 py-1 text-[10px] font-mono text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-3 py-2 border-t border-[#1e2028]">
        <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider mb-1.5">
          Quick Prompts
        </div>
        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              disabled={isLoading}
              className="text-[9px] font-mono text-gray-500 hover:text-cyan-400 bg-[#1a1b1e] hover:bg-[#1e2028] border border-[#2d3748] hover:border-cyan-500/30 rounded px-1.5 py-0.5 transition-all disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-[#1e2028]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage(input)
              }
            }}
            placeholder="Describe an automaton or ask a question..."
            rows={2}
            className="flex-1 bg-[#1a1b1e] border border-[#2d3748] rounded px-2 py-1.5 text-xs font-mono text-gray-300 placeholder-gray-600 outline-none focus:border-cyan-500 resize-none transition-colors"
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-xs font-mono hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all self-end"
          >
            ↑
          </button>
        </div>
        <div className="text-[9px] font-mono text-gray-600 mt-1">
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  )
}
