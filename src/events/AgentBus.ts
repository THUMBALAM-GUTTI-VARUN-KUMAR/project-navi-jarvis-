export interface PipelineTask {
  id: string;
  agentRole: string;
  instructions: string;
  dependsOn?: string[];
}

export interface AgentEventData {
  type: 'start' | 'progress' | 'complete' | 'error' | 'pipeline-started';
  id: string;
  role?: string;
  status?: string;
  result?: string;
  error?: string;
  tasks?: PipelineTask[];
}

type AgentSubscriber = (visible: boolean) => void;
type AgentEventSubscriber = (event: AgentEventData) => void;

class AgentEventBus {
  private subscribers: AgentSubscriber[] = [];
  private eventSubscribers: AgentEventSubscriber[] = [];
  private isVisible: boolean = false;

  constructor() {
    if (window.electronAPI?.onAgentEvent) {
      window.electronAPI.onAgentEvent((_, payload: AgentEventData) => {
        this.eventSubscribers.forEach(sub => sub(payload));
      });
    }
  }

  subscribe(callback: AgentSubscriber) {
    this.subscribers.push(callback);
    callback(this.isVisible);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  subscribeEvents(callback: AgentEventSubscriber) {
    this.eventSubscribers.push(callback);
    return () => {
      this.eventSubscribers = this.eventSubscribers.filter(sub => sub !== callback);
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

export const agentBus = new AgentEventBus();
