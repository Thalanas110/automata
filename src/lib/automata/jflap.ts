import type { AutomataGraph, State, Transition } from './types'

// ─── JFLAP XML Export ────────────────────────────────────────────────────────

export function exportToJFLAP(graph: AutomataGraph): string {
  const typeMap: Record<string, string> = {
    DFA: 'fa',
    NFA: 'fa',
    PDA: 'pda',
    TM: 'turing',
  }
  const jflapType = typeMap[graph.type] ?? 'fa'

  const stateXml = graph.states
    .map((s, i) => {
      const initial = s.isStart ? '\n      <initial/>' : ''
      const final = s.isAccept ? '\n      <final/>' : ''
      return `  <state id="${i}" name="${escapeXml(s.label)}">
      <x>${Math.round(s.x)}</x>
      <y>${Math.round(s.y)}</y>${initial}${final}
    </state>`
    })
    .join('\n')

  const stateIndex = (id: string) => graph.states.findIndex((s) => s.id === id)

  const transitionXml = graph.transitions
    .map((t) => {
      const fromIdx = stateIndex(t.from)
      const toIdx = stateIndex(t.to)
      if (fromIdx === -1 || toIdx === -1) return ''

      if (graph.type === 'DFA' || graph.type === 'NFA') {
        const labels = t.label.split(',').map((l) => l.trim())
        return labels
          .map((label) => {
            const read =
              label === 'ε' || label === ''
                ? ''
                : `\n      <read>${escapeXml(label)}</read>`
            return `  <transition>
      <from>${fromIdx}</from>
      <to>${toIdx}</to>${read}
    </transition>`
          })
          .join('\n')
      }

      if (graph.type === 'PDA') {
        // PDA label format: "a,A/BA"
        const match = t.label.match(/^(.+),(.+)\/(.+)$/)
        if (!match) return ''
        const read = match[1].trim() === 'ε' ? '' : escapeXml(match[1].trim())
        const pop = match[2].trim() === 'ε' ? '' : escapeXml(match[2].trim())
        const push = match[3].trim() === 'ε' ? '' : escapeXml(match[3].trim())
        return `  <transition>
      <from>${fromIdx}</from>
      <to>${toIdx}</to>
      <read>${read}</read>
      <pop>${pop}</pop>
      <push>${push}</push>
    </transition>`
      }

      if (graph.type === 'TM') {
        // TM label format: "a/b,R"
        const match = t.label.match(/^(.+)\/(.+),(L|R|S)$/)
        if (!match) return ''
        const read = escapeXml(match[1].trim())
        const write = escapeXml(match[2].trim())
        const move = match[3].trim()
        return `  <transition>
      <from>${fromIdx}</from>
      <to>${toIdx}</to>
      <read>${read}</read>
      <write>${write}</write>
      <move>${move}</move>
    </transition>`
      }

      return ''
    })
    .filter(Boolean)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!--AutomataStudio JFLAP Export-->
<structure>
  <type>${jflapType}</type>
  <automaton>
${stateXml}
${transitionXml}
  </automaton>
</structure>`
}

// ─── JFLAP XML Import ────────────────────────────────────────────────────────

export function importFromJFLAP(xml: string): AutomataGraph | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    const typeEl = doc.querySelector('type')
    const jflapType = typeEl?.textContent?.trim() ?? 'fa'

    const machineTypeMap: Record<string, 'DFA' | 'NFA' | 'PDA' | 'TM'> = {
      fa: 'NFA',
      pda: 'PDA',
      turing: 'TM',
    }
    const machineType = machineTypeMap[jflapType] ?? 'NFA'

    const stateEls = doc.querySelectorAll('automaton > state')
    const idToUUID = new Map<string, string>()

    const states: State[] = []
    stateEls.forEach((el) => {
      const jflapId = el.getAttribute('id') ?? ''
      const uuid = crypto.randomUUID()
      idToUUID.set(jflapId, uuid)
      const x = parseFloat(el.querySelector('x')?.textContent ?? '100')
      const y = parseFloat(el.querySelector('y')?.textContent ?? '100')
      const label = el.getAttribute('name') ?? jflapId
      const isStart = el.querySelector('initial') !== null
      const isAccept = el.querySelector('final') !== null
      states.push({ id: uuid, label, x, y, isStart, isAccept })
    })

    const transitionEls = doc.querySelectorAll('automaton > transition')
    const transitions: Transition[] = []

    transitionEls.forEach((el) => {
      const fromId = el.querySelector('from')?.textContent ?? ''
      const toId = el.querySelector('to')?.textContent ?? ''
      const from = idToUUID.get(fromId)
      const to = idToUUID.get(toId)
      if (!from || !to) return

      let label = ''
      if (machineType === 'NFA' || machineType === 'DFA') {
        const read = el.querySelector('read')?.textContent ?? ''
        label = read || 'ε'
      } else if (machineType === 'PDA') {
        const read = el.querySelector('read')?.textContent || 'ε'
        const pop = el.querySelector('pop')?.textContent || 'ε'
        const push = el.querySelector('push')?.textContent || 'ε'
        label = `${read},${pop}/${push}`
      } else if (machineType === 'TM') {
        const read = el.querySelector('read')?.textContent ?? ''
        const write = el.querySelector('write')?.textContent ?? ''
        const move = el.querySelector('move')?.textContent ?? 'R'
        label = `${read}/${write},${move}`
      }

      transitions.push({
        id: crypto.randomUUID(),
        from,
        to,
        label,
      })
    })

    return {
      id: crypto.randomUUID(),
      name: 'Imported Machine',
      type: machineType,
      states,
      transitions,
      alphabet: [],
    }
  } catch {
    return null
  }
}

// ─── JSON Export/Import ───────────────────────────────────────────────────────

export function exportToJSON(graph: AutomataGraph): string {
  return JSON.stringify(graph, null, 2)
}

export function importFromJSON(json: string): AutomataGraph | null {
  try {
    const parsed = JSON.parse(json) as AutomataGraph
    if (!parsed.states || !parsed.transitions || !parsed.type) return null
    return parsed
  } catch {
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
