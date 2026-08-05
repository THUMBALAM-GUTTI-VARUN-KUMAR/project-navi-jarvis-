/**
 * LiveSession
 * Coordinates WebSocket connection to Gemini Live API backend,
 * manages AudioStreamer mic capture, AudioPlayer output playback,
 * ToolManager function calls, and real-time state tracking.
 */

import { AudioStreamer } from "./AudioStreamer";
import { AudioPlayer } from "./AudioPlayer";
import { ToolManager, ToolLogItem, NoteItem } from "./ToolManager";

export type SessionState = "disconnected" | "connecting" | "listening" | "speaking";

export interface TranscriptItem {
  id: string;
  role: "user" | "navi";
  text: string;
  timestamp: number;
}

export interface LiveSessionCallbacks {
  onStateChange: (state: SessionState) => void;
  onTranscript: (item: TranscriptItem) => void;
  onError: (errorMessage: string) => void;
  onThemeChange: (theme: string) => void;
  onToolExecuted: (log: ToolLogItem) => void;
  onNotesUpdated: (notes: NoteItem[]) => void;
  onOpenWebsite?: (url: string, label?: string) => void;
  onAmbientSoundChange?: (sound: string) => void;
  onAudioLevelsUpdate?: (inputVol: number, outputVol: number) => void;
  onCloseUIElement?: (elementName: string) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private streamer: AudioStreamer | null = null;
  private player: AudioPlayer;
  private toolManager: ToolManager;
  private state: SessionState = "disconnected";
  private currentInputVolume: number = 0;
  private inputMuted: boolean = false;
  private callbacks: LiveSessionCallbacks;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
    this.player = new AudioPlayer();
    this.toolManager = new ToolManager();

    this.toolManager.setCallbacks({
      onThemeChange: (theme) => this.callbacks.onThemeChange(theme),
      onToolExecuted: (log) => this.callbacks.onToolExecuted(log),
      onNotesUpdated: (notes) => this.callbacks.onNotesUpdated(notes),
      onOpenWebsite: (url, label) => {
        if (this.callbacks.onOpenWebsite) {
          this.callbacks.onOpenWebsite(url, label);
        }
      },
      onAmbientSoundChange: (sound) => {
        if (this.callbacks.onAmbientSoundChange) {
          this.callbacks.onAmbientSoundChange(sound);
        }
      },
      onLearningModeToggle: (active) => {
        import("../events/LearningBus").then(({ learningBus }) => {
          if (active) {
            learningBus.open();
          } else {
            learningBus.close();
          }
        });
      },
      onCloseUIElement: (elementName) => {
        if (elementName === 'secondbrain') {
          import("../events/SecondBrainBus").then(({ secondBrainBus }) => secondBrainBus.close());
        } else if (elementName === 'email') {
          import("../events/EmailBus").then(({ emailBus }) => {
            // Note: emailBus doesn't have an explicit close, we just toggle if visible
            if ((emailBus as any).visible || false) {
              emailBus.toggle(); 
            }
          });
        } else if (elementName === 'learning') {
          import("../events/LearningBus").then(({ learningBus }) => learningBus.close());
        }
        
        if (this.callbacks.onCloseUIElement) {
          this.callbacks.onCloseUIElement(elementName);
        }
      },
    });

    this.player.setOnPlaybackEnd(() => {
      if (this.state === "speaking") {
        this.setState("listening");
      }
    });
  }

  public async connect(options?: { voice?: string; userName?: string }): Promise<void> {
    if (this.state !== "disconnected") return;

    this.setState("connecting");

    try {
      this.player.init();

      const protocol = "ws:";
      const host = "localhost:3000";
      const voice = options?.voice || "Kore";
      const userName = encodeURIComponent(options?.userName || "");
      const wsUrl = `${protocol}//${host}/live?voice=${voice}&userName=${userName}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Connected to backend proxy
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "status": {
              if (msg.status === "connected") {
                await this.startMicrophone();
                this.setState("listening");
                
                // Automatically inject saved memories into the session context
                const memories = this.toolManager.getNotes();
                if (memories.length > 0) {
                  const memoryText = memories.map(m => `- [${m.category || 'general'}] ${m.content}`).join('\n');
                  this.sendTextMessage(
                    `[System Context: Here are the user's previously saved long-term memories/preferences. You already know these. Do not mention them immediately unless relevant to the user's current topic.]\n${memoryText}`
                  );
                }
              } else if (msg.status === "closed") {
                this.disconnect();
              }
              break;
            }

            case "audio": {
              if (msg.data) {
                if (this.state !== "speaking") {
                  this.setState("speaking");
                }
                await this.player.playChunk(msg.data);
              }
              break;
            }

            case "interrupted": {
              this.player.clearQueue();
              this.setState("listening");
              break;
            }

            case "turnComplete": {
              if (!this.player.getIsPlaying()) {
                this.setState("listening");
              }
              break;
            }

            case "transcript": {
              if (msg.text) {
                this.callbacks.onTranscript({
                  id: "tr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
                  role: msg.role === "user" ? "user" : "navi",
                  text: msg.text,
                  timestamp: Date.now(),
                });
              }
              break;
            }

            case "toolCall": {
              if (msg.id && msg.name) {
                const response = await this.toolManager.executeTool(msg.id, msg.name, msg.args || {});
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                  this.ws.send(
                    JSON.stringify({
                      type: "toolResponse",
                      id: msg.id,
                      name: msg.name,
                      response,
                    })
                  );
                }
              }
              break;
            }

            case "error": {
              this.callbacks.onError(msg.error || "An error occurred with Gemini Live session.");
              break;
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError("WebSocket connection error. Make sure your server is running.");
        this.disconnect();
      };

      this.ws.onclose = () => {
        if (this.state !== "disconnected") {
          this.disconnect();
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.callbacks.onError(errorMsg);
      this.disconnect();
    }
  }

  public disconnect(): void {
    if (this.streamer) {
      this.streamer.stop();
      this.streamer = null;
    }

    this.player.clearQueue();
    this.player.close();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.setState("disconnected");
  }

  public setMuted(muted: boolean): void {
    this.inputMuted = muted;
    if (this.streamer) {
      this.streamer.setMuted(muted);
    }
  }

  public isMuted(): boolean {
    return this.inputMuted;
  }

  public getState(): SessionState {
    return this.state;
  }

  public getToolManager(): ToolManager {
    return this.toolManager;
  }

  public getAudioLevels(): { inputVolume: number; outputVolume: number } {
    const outputVol = this.player.getVolume();
    return {
      inputVolume: this.inputMuted ? 0 : this.currentInputVolume,
      outputVolume: outputVol,
    };
  }

  public getFrequencyData(array: Uint8Array): void {
    this.player.getFrequencyData(array);
  }

  public sendTextMessage(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  private async startMicrophone(): Promise<void> {
    this.streamer = new AudioStreamer({
      onAudioChunk: (base64Pcm, volume) => {
        this.currentInputVolume = volume;
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.inputMuted) {
          this.ws.send(JSON.stringify({ type: "audio", data: base64Pcm }));
        }
      },
      onError: (err) => {
        this.callbacks.onError(`Microphone error: ${err.message}`);
      },
    });

    await this.streamer.start();
    if (this.inputMuted) {
      this.streamer.setMuted(true);
    }
  }

  private setState(newState: SessionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }
}
