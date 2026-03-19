let _counter = 0;
export const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${_counter++}`;
