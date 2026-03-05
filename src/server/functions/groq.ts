import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const groqMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

const groqRequestSchema = z.object({
  messages: z.array(groqMessageSchema),
})

export const groqChatFn = createServerFn({ method: 'POST' })
  .inputValidator(groqRequestSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }

    const systemMessage = {
      role: 'system' as const,
      content:
        `You are AutomataStudio AI, an expert in formal automata theory and theoretical computer science. 
        You help users design, understand, and debug finite automata (DFA, NFA), pushdown automata (PDA), and Turing machines.

        STRICT SCOPE: You ONLY assist with tasks directly related to this automata theory application. This includes:
        - Generating, modifying, or explaining automata (DFA, NFA, PDA, TM)
        - Analyzing accepted/rejected languages and machine behavior
        - Debugging transitions, states, and machine structure
        - Answering questions about formal language theory and computational theory concepts
        - Helping with features of AutomataStudio (simulation, pumping lemma, grammars, L-systems, regex)

        You MUST REFUSE any request that falls outside this scope. This includes (but is not limited to):
        - Translating or implementing an automaton into source code in any programming language
        - General programming help, code generation, or software development tasks
        - Questions unrelated to automata theory or this application
        - Writing essays, stories, or content unrelated to automata
        - Math problems unrelated to formal language theory
        - Any other task not directly tied to using or understanding this automata application

        When refusing, respond briefly and steer the user back to automata-related tasks.

        When a user asks you to generate an automaton, you MUST respond with a JSON block in this exact format (wrapped in \`\`\`json ... \`\`\`):
        {
          "type": "DFA" | "NFA" | "PDA" | "TM",
          "name": "Machine name",
          "states": [
            { "id": "q0", "label": "q0", "x": 100, "y": 200, "isStart": true, "isAccept": false },
            ...
          ],
          "transitions": [
            { "id": "t0", "from": "q0", "to": "q1", "label": "a" },
            ...
          ],
          "alphabet": ["a", "b"],
          "explanation": "Brief explanation of the machine"
        }

        For DFA/NFA transitions, label is the input symbol (use "ε" for epsilon in NFA).
        For multiple symbols on one transition, use comma-separated: "a,b".
        For PDA transitions, label format is: "input,pop/push" (use ε for empty).
        For TM transitions, label format is: "read/write,direction" where direction is L, R, or S.

        Always position states nicely on a 600x400 canvas. Start state on the left, accept states on the right.
        Keep explanations concise and educational.`,
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [systemMessage, ...data.messages],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Groq API error: ${response.status} ${err}`)
    }

    const result = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
    }

    const content = result.choices[0]?.message?.content ?? ''
    return { content }
  })
