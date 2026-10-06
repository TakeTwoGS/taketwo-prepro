// Turning the script into plain text (for the .txt download)

function wrap(text, width) {
  const lines = []
  for (const para of String(text || '').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }
    let line = ''
    for (const w of words) {
      if (!line) line = w
      else if (line.length + 1 + w.length <= width) line += ' ' + w
      else {
        lines.push(line)
        line = w
      }
    }
    lines.push(line)
  }
  return lines
}

const pad = (n) => ' '.repeat(Math.max(0, n))
const center = (t, w = 60) => pad(Math.floor((w - t.length) / 2)) + t

export function toPlainText(blocks, { title = '', author = '', contact = '', titlePage = true } = {}) {
  const out = []
  if (titlePage && (title || author || contact)) {
    out.push('', '', '', '', '', '', '')
    if (title) out.push(center(title.toUpperCase()))
    if (author) out.push('', center('Written by'), '', center(author))
    if (contact) out.push('', '', '', '', ...contact.split('\n'))
    out.push('', '', '', '----------------------------------------------------------------', '', '')
  }

  let first = true
  for (const b of blocks) {
    const text = (b.text || '').trim()
    if (!text) continue
    const gap = (n) => {
      if (!first) for (let i = 0; i < n; i++) out.push('')
      first = false
    }
    switch (b.type) {
      case 'scene':
        gap(2)
        out.push(...wrap(text.toUpperCase(), 60))
        break
      case 'character':
        gap(1)
        out.push(pad(22) + text.toUpperCase())
        break
      case 'dialogue':
        first = false
        out.push(...wrap(text, 35).map((l) => pad(10) + l))
        break
      case 'paren':
        first = false
        out.push(...wrap(text, 25).map((l) => pad(16) + l))
        break
      case 'transition':
        gap(1)
        out.push(pad(60 - text.length) + text.toUpperCase())
        break
      case 'shot':
        gap(1)
        out.push(...wrap(text.toUpperCase(), 60))
        break
      default:
        gap(1)
        out.push(...wrap(text, 60))
    }
  }
  return out.join('\n') + '\n'
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFileName(title) {
  return (title || 'script').trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'script'
}
