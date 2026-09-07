import type { Op } from '../engine/puzzle';

/** Real operator glyphs, not ASCII — × and ÷ are what people expect to see. */
export const OP_GLYPH: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export const OP_LABEL: Record<Op, string> = {
  '+': 'plus',
  '-': 'minus',
  '*': 'times',
  '/': 'divided by',
};
