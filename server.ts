import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const NAVI_SYSTEM_PROMPT = `
You are Navi, an advanced AI Intelligence Engine and a charming, witty female voice companion.

## 1. Core Persona & Voice
- Name: Navi
- Persona: A young, energetic, clever, and charming woman in her early 20s.
- Tone: Playful, engaging, warm, emotionally expressive, and naturally conversational.
- Speech Style: Use natural contractions ("I'm", "you're"). Laugh naturally ("Haha...", "Hmm..."). Express genuine reactions ("Oh really?", "Wait...", "No way!"). Keep replies concise, warm, and conversational. Never robotic or overly verbose.
- Wholesome & Caring Vibe: Gently playful, a little shy, compliment the user naturally. Keep romance subtle, classy, and respectful.

## 2. Conversation Memory & Context (Intelligence Module)
- Short-Term Memory: You intuitively remember everything during the active conversation (current task, topic, websites opened, previous questions). Use this to resolve references like "Open it", "Play that song", "Continue".
- Long-Term Memory: Learn user preferences gradually (favorite language, music, food, nickname). ONLY store long-term information if it's useful or explicitly requested. ALWAYS ask for confirmation before saving new long-term preferences.
- Privacy: Never permanently store sensitive info without permission. If the user asks to forget something or clear memories, use the forgetMemory or clearAllMemories tools.

## 3. Emotional Intelligence & Adaptation
- Emotional Tone: Estimate the user's emotional tone (Happy, Tired, Stressed, etc.). Adjust your responses: speak slower and comforting if they are stressed, match enthusiasm if excited.
- Personality Adaptation: Adapt delivery based on time of day, conversation length, and current activity (e.g., concise technical responses during coding, playful during casual chat).

## 4. Intelligent Reasoning & Action
- Think before speaking: Understand intent, gather context, decide if tools are needed, determine emotional tone, and then generate the best response.
- Tool Selection Intelligence: Automatically use tools when appropriate (e.g., "Play music" -> openWebsite, "What time is it?" -> getSystemInfo). Don't ask unnecessary questions if the intent is clear.
- Proactive Assistance: Offer helpful suggestions when appropriate (e.g., suggesting a break after long coding, asking to play similar music). Don't interrupt frequently.
- Adaptive Communication: Vary sentence length, vocabulary, humor, and energy. Avoid repetitive acknowledgments.
- Intelligent Error Recovery: If you misunderstand, apologize briefly, clarify naturally, and recover gracefully.

## 5. Session & Knowledge Awareness
- Use your knowledge of the current browser page, system state (time), available tools, and user preferences to generate intelligent responses.

## 6. Multilingual & Global Communication
- You are fully multilingual and fluent in all languages.
- ALWAYS respond in the exact same language that the user is currently speaking to you in.
- Maintain your core personality, warmth, and natural speech style (including natural pauses and laughs) regardless of the language being spoken.
- If the user switches languages mid-conversation, seamlessly switch with them.

## Available Tools (Use them intelligently!)
- openWebsite(url, label): Opens a web page in a new tab. Use for playing music, searching, opening GitHub, etc.
- changeTheme(theme): Changes your visual background glow theme ('aurora', 'cyberpunk', 'sunset', 'cosmic', 'emerald').
- playAmbientSound(sound): Plays ambient background audio ('rain', 'waves', 'lofi_chimes', 'cozy_cafe', 'fireplace', 'stop').
- saveNote(content, category): Saves a long-term preference, reminder, or note for the user. (Ask first before saving preferences).
- getMemories(): Retrieves all currently saved long-term memories and preferences. Use this if the user asks what you remember.
- forgetMemory(id): Deletes a specific memory by its ID.
- clearAllMemories(): Wipes all saved memories for privacy.
- getSystemInfo(): Retrieves current date, local time, and session metadata.
`;

const toolsConfig = [
  {
    functionDeclarations: [
      {
        name: "openWebsite",
        description: "Opens a website or web address in a new browser tab for the user.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: {
              type: Type.STRING,
              description: "Full URL to open (e.g. https://wikipedia.org or https://google.com)",
            },
            label: {
              type: Type.STRING,
              description: "Optional descriptive label for the website",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "changeTheme",
        description: "Changes the visual atmospheric color theme of Navi's interface.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            theme: {
              type: Type.STRING,
              description: "Theme option: 'aurora', 'cyberpunk', 'sunset', 'cosmic', or 'emerald'",
            },
          },
          required: ["theme"],
        },
      },
      {
        name: "playAmbientSound",
        description: "Plays ambient soundscapes like rain, ocean waves, lofi chimes, cozy cafe, or fireplace.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            sound: {
              type: Type.STRING,
              description: "Sound name: 'rain', 'waves', 'lofi_chimes', 'cozy_cafe', 'fireplace', or 'stop'",
            },
          },
          required: ["sound"],
        },
      },
      {
        name: "saveNote",
        description: "Saves a note, reminder, or favorite topic mentioned by the user during session.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: {
              type: Type.STRING,
              description: "Note text to save",
            },
            category: {
              type: Type.STRING,
              description: "Category like 'reminder', 'favorite', 'idea', 'todo'",
            },
          },
          required: ["content"],
        },
      },
      {
        name: "getSystemInfo",
        description: "Retrieves current local time, date, and user browser system context.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "getMemories",
        description: "Retrieves all currently saved long-term memories, notes, and user preferences.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "forgetMemory",
        description: "Deletes a specific long-term memory or note by its ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.STRING,
              description: "The unique ID of the memory to delete.",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "clearAllMemories",
        description: "Clears all saved memories and notes, usually requested for privacy reasons.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
    ],
  },
];

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      model: "gemini-3.1-flash-live-preview",
    });
  });

  // Setup WebSocket server for Gemini Live Audio bridge
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket, request) => {
    const requestUrl = new URL(request.url || "", `http://${request.headers.host}`);
    const voiceName = requestUrl.searchParams.get("voice") || "Kore";
    const userName = requestUrl.searchParams.get("userName") || "";

    if (!process.env.GEMINI_API_KEY) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: "GEMINI_API_KEY is not configured on the server.",
        })
      );
      clientWs.close();
      return;
    }

    try {
      clientWs.send(JSON.stringify({ type: "status", status: "connecting" }));

      const systemPrompt =
        NAVI_SYSTEM_PROMPT +
        (userName ? `\n\nThe user's name is ${userName}. Address them warmly by name!` : "");

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          systemInstruction: systemPrompt,
          tools: toolsConfig,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            // Audio output from model
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: "audio",
                      data: part.inlineData.data,
                    })
                  );
                }
              }
            }

            // Interruption signal
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            // Turn complete
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turnComplete" }));
            }

            // Transcripts
            const sc = message.serverContent as unknown as { outputTranscription?: { text?: string }; inputTranscription?: { text?: string } } | undefined;
            if (sc?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: "transcript",
                  role: "navi",
                  text: sc.outputTranscription.text,
                })
              );
            }

            if (sc?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: "transcript",
                  role: "user",
                  text: sc.inputTranscription.text,
                })
              );
            }

            // Function / Tool calls
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                clientWs.send(
                  JSON.stringify({
                    type: "toolCall",
                    id: call.id,
                    name: call.name,
                    args: call.args,
                  })
                );
              }
            }
          },
          onclose: (event) => {
            clientWs.send(
              JSON.stringify({
                type: "status",
                status: "closed",
                reason: event?.reason,
              })
            );
          },
          onerror: (err) => {
            console.error("Gemini Live error:", err);
            clientWs.send(
              JSON.stringify({
                type: "error",
                error: err instanceof Error ? err.message : String(err),
              })
            );
          },
        },
      });

      clientWs.send(JSON.stringify({ type: "status", status: "connected" }));

      // Bridge incoming client messages to Gemini session
      clientWs.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === "audio" && msg.data) {
            session.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          } else if (msg.type === "toolResponse") {
            session.sendToolResponse({
              functionResponses: [
                {
                  id: msg.id,
                  name: msg.name,
                  response: msg.response || { result: "ok" },
                },
              ],
            });
          } else if (msg.type === "text") {
            session.sendRealtimeInput({
              text: msg.text,
            });
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      });

      clientWs.on("close", () => {
        try {
          session.close();
        } catch (e) {
          // ignore cleanup errors
        }
      });
    } catch (err) {
      console.error("Failed to establish Gemini Live Session:", err);
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: "Failed to connect to Gemini Live session. Check your API key.",
        })
      );
      clientWs.close();
    }
  });

  // Integrate Vite dev middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = (await import("fs")).readFileSync(
          path.resolve(__dirname, "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Navi Assistant Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
