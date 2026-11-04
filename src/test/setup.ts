import '@testing-library/jest-dom/vitest'

const emptyClientRects = () => [] as unknown as DOMRectList
const emptyBoundingRect = () => new DOMRect(0, 0, 0, 0)

document.elementFromPoint = () => document.querySelector('[contenteditable="true"]') ?? document.body
Range.prototype.getClientRects = emptyClientRects
Range.prototype.getBoundingClientRect = emptyBoundingRect
HTMLElement.prototype.getClientRects = emptyClientRects
HTMLElement.prototype.getBoundingClientRect = emptyBoundingRect
