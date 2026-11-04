import type { JSONContent } from '@tiptap/react'

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}\x5B\x5D<>#+.!|~-])/g, '\\$1')
}

function renderInline(node: JSONContent): string {
  if (node.type === 'hardBreak') return '  \n'
  if (node.type !== 'text') return (node.content ?? []).map(renderInline).join('')

  let text = escapeMarkdown(node.text ?? '')
  for (const mark of node.marks ?? []) {
    const wrap = mark.type === 'bold'
      ? (value: string) => `**${value}**`
      : mark.type === 'italic'
        ? (value: string) => `_${value}_`
        : mark.type === 'underline'
          ? (value: string) => `<u>${value}</u>`
          : null
    if (wrap) {
      text = text.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_match, leading: string, value: string, trailing: string) =>
        value ? `${leading}${wrap(value)}${trailing}` : text)
    }
  }
  return text
}

function renderListItem(item: JSONContent, marker: string): string {
  const blocks = item.content ?? []
  const firstBlock = blocks[0]
  const firstLine = firstBlock?.type === 'paragraph'
    ? (firstBlock.content ?? []).map(renderInline).join('')
    : firstBlock ? renderBlock(firstBlock) : ''
  const remaining = blocks.slice(1).map(renderBlock).filter(Boolean)
  const nestedIndent = ' '.repeat(marker.length)
  const nested = remaining.map((block) => block.split('\n').map((line) => `${nestedIndent}${line}`).join('\n'))
  return [marker + firstLine, ...nested].join('\n')
}

function renderBlock(node: JSONContent): string {
  if (node.type === 'paragraph') return (node.content ?? []).map(renderInline).join('')
  if (node.type === 'heading') {
    const level = Math.min(6, Math.max(1, node.attrs?.level as number || 1))
    return `${'#'.repeat(level)} ${(node.content ?? []).map(renderInline).join('')}`
  }
  if (node.type === 'bulletList') {
    return (node.content ?? []).map((item) => renderListItem(item, '- ')).join('\n')
  }
  if (node.type === 'orderedList') {
    const start = typeof node.attrs?.start === 'number' ? node.attrs.start : 1
    return (node.content ?? []).map((item, index) => renderListItem(item, `${start + index}. `)).join('\n')
  }
  return (node.content ?? []).map(renderBlock).filter(Boolean).join('\n\n')
}

export function documentToMarkdown(title: string, content: JSONContent): string {
  const body = (content.content ?? []).map(renderBlock).filter(Boolean).join('\n\n')
  const markdownTitle = escapeMarkdown(title)
  return body ? `# ${markdownTitle}\n\n${body}\n` : `# ${markdownTitle}\n`
}

export function markdownFilename(title: string): string {
  const sanitized = title
    .normalize('NFKD')
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 0x20 && character.charCodeAt(0) !== 0x7f)
    .join('')
    .replace(/[. ]+$/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 100)
  return `${sanitized || 'document'}.md`
}

export function downloadMarkdown(title: string, content: JSONContent): void {
  const url = URL.createObjectURL(new Blob([documentToMarkdown(title, content)], {
    type: 'text/markdown;charset=utf-8',
  }))
  const link = window.document.createElement('a')
  link.href = url
  link.download = markdownFilename(title)
  link.click()
  URL.revokeObjectURL(url)
}
