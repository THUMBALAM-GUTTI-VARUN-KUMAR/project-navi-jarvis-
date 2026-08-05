type Listener = (visible: boolean) => void;

class CommunicationBus {
  private listeners: Listener[] = [];
  public visible = false;
  
  public mode: 'free' | 'shadowing' | 'roleplay' | 'interview' | 'presentation' = 'free';
  public stats = {
    fluency: 100,
    grammar: 100,
    vocabulary: 100
  };

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    listener(this.visible);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  open(mode: string = 'free') {
    this.mode = mode as any;
    if (!this.visible) {
      this.visible = true;
      this.listeners.forEach((l) => l(true));
    } else {
      this.listeners.forEach((l) => l(this.visible));
    }
  }

  close() {
    if (this.visible) {
      this.visible = false;
      this.listeners.forEach((l) => l(false));
    }
  }

  updateStats(fluency: number, grammar: number, vocabulary: number) {
    this.stats = { fluency, grammar, vocabulary };
    this.listeners.forEach((l) => l(this.visible));
  }
}

export const communicationBus = new CommunicationBus();
