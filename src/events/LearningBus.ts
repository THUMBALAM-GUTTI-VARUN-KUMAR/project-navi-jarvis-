type Listener = (visible: boolean) => void;

class LearningBus {
  private listeners: Listener[] = [];
  public visible = false;
  
  public topic: string = '';
  public concept: string = '';
  public content: string = '';
  public mode: 'whiteboard' | 'mindmap' | 'algorithm' = 'whiteboard';

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    listener(this.visible);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  toggle() {
    this.visible = !this.visible;
    this.listeners.forEach((l) => l(this.visible));
  }

  open() {
    if (!this.visible) {
      this.visible = true;
      this.listeners.forEach((l) => l(true));
    }
  }

  close() {
    if (this.visible) {
      this.visible = false;
      this.listeners.forEach((l) => l(false));
    }
  }

  updateWhiteboard(topic: string, concept: string, content: string) {
    this.topic = topic;
    this.concept = concept;
    this.content = content;
    this.mode = 'whiteboard';
    // Trigger re-render even if already open
    this.listeners.forEach((l) => l(this.visible));
  }

  generateMindMap(rootNode: string, children: string[]) {
    this.topic = "Mind Map: " + rootNode;
    this.concept = rootNode;
    // Simple mermaid generation for now
    this.content = `
\`\`\`mermaid
graph TD
  Root["${rootNode}"]
  ${children.map((c, i) => `Root --> C${i}["${c}"]`).join('\n  ')}
\`\`\`
    `;
    this.mode = 'mindmap';
    this.listeners.forEach((l) => l(this.visible));
  }

  visualizeAlgorithm(algorithm: string, data: number[]) {
    this.topic = "Algorithm: " + algorithm;
    this.concept = algorithm;
    // Generate an animated representation or a state representation
    this.content = `### Execution: ${algorithm}\n\n**Data:** \`[${data.join(', ')}]\`\n\n*Running visualization...*`;
    this.mode = 'algorithm';
    this.listeners.forEach((l) => l(this.visible));
  }
}

export const learningBus = new LearningBus();
