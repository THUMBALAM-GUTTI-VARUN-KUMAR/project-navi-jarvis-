type Listener = (visible: boolean) => void;

class CareerBus {
  private listeners: Listener[] = [];
  public visible = false;
  
  public view: 'dashboard' | 'resume' | 'interview' | 'practice' = 'dashboard';

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

  open(view?: string) {
    if (view) this.view = view as any;
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
}

export const careerBus = new CareerBus();
