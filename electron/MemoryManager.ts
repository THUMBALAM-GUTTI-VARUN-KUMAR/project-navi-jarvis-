import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

export interface Memory {
  id: string;
  content: string;
  category: string;
  source: string;
  createdAt: number;
  updatedAt: number;
  confidence: number;
  importance: number;
  projectId: string | null;
  tags: string;
  lastAccessed: number;
  accessCount: number;
  embedding?: number[];
}

export interface LearningTopic {
  id: string;
  name: string;
  masteryScore: number;
  lastTested: number;
}

export interface Flashcard {
  id: string;
  topicId: string;
  front: string;
  back: string;
  nextReviewDate: number;
  interval: number;
  easeFactor: number;
}

export class MemoryManager {
  private db: Database.Database;
  private ai: GoogleGenAI;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'navi_second_brain.sqlite');
    this.db = new Database(dbPath);
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    this.initializeDatabase();
  }

  private initializeDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        confidence REAL NOT NULL,
        importance REAL NOT NULL,
        projectId TEXT,
        tags TEXT NOT NULL,
        lastAccessed INTEGER NOT NULL,
        accessCount INTEGER NOT NULL,
        embedding BLOB
      );

      CREATE TABLE IF NOT EXISTS learning_topics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        masteryScore REAL NOT NULL,
        lastTested INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY,
        topicId TEXT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        nextReviewDate INTEGER NOT NULL,
        interval INTEGER NOT NULL,
        easeFactor REAL NOT NULL
      );
    `);
  }

  public async addMemory(memory: Omit<Memory, 'embedding'>): Promise<void> {
    let embeddingBlob: Buffer | null = null;
    try {
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: memory.content
      });
      if (response.embeddings && response.embeddings[0].values) {
        embeddingBlob = Buffer.from(new Float32Array(response.embeddings[0].values).buffer);
      }
    } catch (e) {
      console.error('Failed to generate embedding for memory:', e);
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, content, category, source, createdAt, updatedAt, 
        confidence, importance, projectId, tags, lastAccessed, accessCount, embedding
      ) VALUES (
        @id, @content, @category, @source, @createdAt, @updatedAt, 
        @confidence, @importance, @projectId, @tags, @lastAccessed, @accessCount, @embedding
      )
    `);

    stmt.run({
      ...memory,
      embedding: embeddingBlob
    });
  }

  public async searchMemories(query: string, projectId: string | null = null, limit: number = 5): Promise<Memory[]> {
    let queryEmbedding: number[] | null = null;
    try {
      const response = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: query
      });
      if (response.embeddings && response.embeddings[0].values) {
        queryEmbedding = response.embeddings[0].values;
      }
    } catch (e) {
      console.error('Failed to generate embedding for query:', e);
      return [];
    }

    if (!queryEmbedding) return [];

    let rows;
    if (projectId) {
      rows = this.db.prepare('SELECT * FROM memories WHERE projectId = ?').all(projectId) as any[];
    } else {
      rows = this.db.prepare('SELECT * FROM memories').all() as any[];
    }

    const memoriesWithScores = rows.map(row => {
      const memory = this.rowToMemory(row);
      let score = 0;
      if (row.embedding && queryEmbedding) {
        const memoryEmbedding = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
        score = this.cosineSimilarity(queryEmbedding, Array.from(memoryEmbedding));
      }
      return { memory, score };
    });

    memoriesWithScores.sort((a, b) => b.score - a.score);
    return memoriesWithScores.slice(0, limit).map(m => {
       const mem = m.memory;
       this.db.prepare('UPDATE memories SET accessCount = accessCount + 1, lastAccessed = ? WHERE id = ?').run(Date.now(), mem.id);
       return mem;
    });
  }

  public deleteMemory(id: string): void {
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  }

  public getAllMemories(): Memory[] {
    const rows = this.db.prepare('SELECT * FROM memories ORDER BY createdAt DESC').all() as any[];
    return rows.map(this.rowToMemory);
  }

  public clearAllMemories(): void {
    this.db.prepare('DELETE FROM memories').run();
  }

  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      content: row.content,
      category: row.category,
      source: row.source,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      confidence: row.confidence,
      importance: row.importance,
      projectId: row.projectId,
      tags: row.tags,
      lastAccessed: row.lastAccessed,
      accessCount: row.accessCount
    };
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // --- Learning Mode Methods ---
  
  public getLearningProfile(): LearningTopic[] {
    return this.db.prepare('SELECT * FROM learning_topics ORDER BY masteryScore ASC').all() as LearningTopic[];
  }

  public updateTopicMastery(id: string, name: string, masteryScore: number): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO learning_topics (id, name, masteryScore, lastTested)
      VALUES (?, ?, ?, ?)
    `).run(id, name, masteryScore, Date.now());
  }

  public getDueFlashcards(): Flashcard[] {
    return this.db.prepare('SELECT * FROM flashcards WHERE nextReviewDate <= ? ORDER BY nextReviewDate ASC').all(Date.now()) as Flashcard[];
  }

  public saveFlashcard(flashcard: Flashcard): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO flashcards (id, topicId, front, back, nextReviewDate, interval, easeFactor)
      VALUES (@id, @topicId, @front, @back, @nextReviewDate, @interval, @easeFactor)
    `).run(flashcard);
  }
}
