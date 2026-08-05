type Listener = (visible: boolean) => void;

class EmailBus {
  private listeners: Listener[] = [];
  private visible = false;

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
}

export const emailBus = new EmailBus();
