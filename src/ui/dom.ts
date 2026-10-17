// Tiny DOM helper. Text is only ever set with textContent, so imported text stays plain (AC88).

export interface ElOptions {
  /** Class names, space separated. */
  class?: string;
  /** Plain text for the element. */
  text?: string;
  /** Attributes such as role or aria-label. */
  attrs?: Record<string, string>;
}

export type Child = Node | string;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElOptions = {},
  children: Child[] = [],
  doc: Document = document,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (options.class) node.className = options.class;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? doc.createTextNode(child) : child);
  }
  return node;
}
