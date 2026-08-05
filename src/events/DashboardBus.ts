type DashboardSubscriber = (visible: boolean) => void;

class DashboardEventBus {
  private subscribers: DashboardSubscriber[] = [];
  private isVisible: boolean = false;

  subscribe(callback: DashboardSubscriber) {
    this.subscribers.push(callback);
    callback(this.isVisible);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  toggle(visible?: boolean) {
    if (visible !== undefined) {
      this.isVisible = visible;
    } else {
      this.isVisible = !this.isVisible;
    }
    this.subscribers.forEach(sub => sub(this.isVisible));
  }
}

export const dashboardBus = new DashboardEventBus();
