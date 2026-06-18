// Simple DOM Mock for running UI/theme/engine tests in Node.js environment
class MockNode {
  childNodes: MockNode[] = [];
  listeners: Record<string, Function[]> = {};
  
  appendChild(child: MockNode) {
    this.childNodes.push(child);
    return child;
  }
  
  addEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  
  removeEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
  
  dispatchEvent(event: { type: string }) {
    const eventType = event.type;
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(cb => cb(event));
    }
  }
}

class ClassList {
  classes = new Set<string>();
  add(...names: string[]) {
    names.forEach(n => this.classes.add(n));
  }
  remove(...names: string[]) {
    names.forEach(n => this.classes.delete(n));
  }
  contains(name: string): boolean {
    return this.classes.has(name);
  }
  get value(): string {
    return Array.from(this.classes).join(' ');
  }
}

class MockElement extends MockNode {
  tagName: string;
  attributes: Record<string, string> = {};
  classList = new ClassList();
  id: string = '';
  textContent: string = '';
  styleProperties: Record<string, string> = {};
  dataset: Record<string, string> = {};
  
  style = new Proxy(this.styleProperties, {
    set: (target, prop, value) => {
      target[prop.toString()] = value.toString();
      return true;
    },
    get: (target, prop) => {
      if (prop === 'setProperty') {
        return (name: string, val: string) => {
          target[name] = val;
        };
      }
      return target[prop.toString()];
    }
  });
  
  constructor(tagName: string) {
    super();
    this.tagName = tagName;
  }
  
  scrollIntoView() {}

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
    if (name === 'id') {
      this.id = value;
    }
    if (name.startsWith('data-')) {
      const dataKey = name.substring(5).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      this.dataset[dataKey] = value;
    }
  }
  get className(): string {
    return this.classList.value;
  }
  set className(val: string) {
    this.classList.classes.clear();
    val.split(' ').filter(Boolean).forEach(c => this.classList.classes.add(c));
  }
  
  get innerHTML(): string {
    return this.outerHTML;
  }
  set innerHTML(val: string) {
    if (val === '') {
      this.childNodes = [];
    }
  }
  
  querySelector(selector: string): MockElement | null {
    const walk = (node: MockNode): MockElement | null => {
      for (const child of node.childNodes) {
        if (child instanceof MockElement) {
          if (selector.startsWith('#') && child.id === selector.substring(1)) {
            return child;
          }
          if (selector.startsWith('.') && !selector.includes('[') && child.classList.contains(selector.substring(1))) {
            return child;
          }
          if (selector === 'img' && child.tagName === 'img') return child;
          if (selector.startsWith('.thumb-item[data-page-index=')) {
            const match = selector.match(/data-page-index="(\d+)"/);
            if (match && child.classList.contains('thumb-item') && child.dataset.pageIndex === match[1]) {
              return child;
            }
          }
          if (selector.startsWith('.bz-page[data-idx=')) {
            const match = selector.match(/data-idx="(\d+)"/);
            if (match && child.classList.contains('bz-page') && child.dataset.idx === match[1]) {
              return child;
            }
          }
          const res = walk(child);
          if (res) return res;
        }
      }
      return null;
    };
    return walk(this);
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    const walk = (node: MockNode) => {
      for (const child of node.childNodes) {
        if (child instanceof MockElement) {
          if (selector === '.bz-page' && child.classList.contains('bz-page')) {
            results.push(child);
          } else if (selector === '.thumb-item' && child.classList.contains('thumb-item')) {
            results.push(child);
          } else if (selector === 'img' && child.tagName === 'img') {
            results.push(child);
          }
          walk(child);
        }
      }
    };
    walk(this);
    return results;
  }

  get outerHTML(): string {
    const attrsList: string[] = [];
    if (this.id) {
      attrsList.push(`id="${this.id}"`);
    }
    const cName = this.className;
    if (cName) {
      attrsList.push(`class="${cName}"`);
    }
    for (const [k, v] of Object.entries(this.attributes)) {
      attrsList.push(`${k}="${v}"`);
    }
    if (Object.keys(this.styleProperties).length > 0) {
      const styleStr = Object.entries(this.styleProperties)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      attrsList.push(`style="${styleStr}"`);
    }
    const attrsPart = attrsList.length > 0 ? ' ' + attrsList.join(' ') : '';
    const childrenPart = this.childNodes
      .map(c => {
        if (c instanceof MockTextNode) return c.text;
        if (c instanceof MockElement) return c.outerHTML;
        return '';
      })
      .join('') || this.textContent;
    return `<${this.tagName}${attrsPart}>${childrenPart}</${this.tagName}>`;
  }
}

class MockTextNode extends MockNode {
  text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }
}

class MockImage {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  naturalWidth = 600;
  naturalHeight = 800;
  _src: string = '';
  get src(): string {
    return this._src;
  }
  set src(val: string) {
    this._src = val;
    // Simulate async load
    setTimeout(() => {
      if (val.includes('error')) {
        this.onerror();
      } else {
        this.onload();
      }
    }, 0);
  }
}

globalThis.Node = MockNode as any;
globalThis.HTMLElement = MockElement as any;
globalThis.HTMLImageElement = MockElement as any;
globalThis.HTMLInputElement = MockElement as any;
globalThis.Image = MockImage as any;

const headElement = new MockElement('head');
const containerElement = new MockElement('div');
containerElement.id = 'app';

globalThis.document = {
  head: headElement,
  getElementById: (id: string) => {
    if (id === 'app') return containerElement;
    return null;
  },
  querySelector(selector: string) {
    if (selector === '#app' || selector === 'div') return containerElement;
    return containerElement.querySelector(selector);
  },
  createElement(tag: string) {
    return new MockElement(tag);
  },
  createTextNode(text: string) {
    return new MockTextNode(text);
  },
  addEventListener: () => {},
  removeEventListener: () => {}
} as any;

globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1024,
  innerHeight: 768,
  matchMedia: () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  open: () => null
} as any;
