import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { MemoryManager, Memory } from './MemoryManager';

const customRequire = createRequire(import.meta.url);

export class LearningManager {
  private memoryManager: MemoryManager;

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
  }

  /**
   * Reads a PDF, chunks the text, and stores it in the vector DB using MemoryManager
   * @param filePath Absolute path to the PDF file
   * @param topic Topic or subject this document belongs to
   */
  public async ingestDocument(filePath: string, topic: string): Promise<{ success: boolean, chunksProcessed: number, error?: string }> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      let textContent = '';

      if (ext === '.txt' || ext === '.md') {
        textContent = await fs.readFile(filePath, 'utf-8');
      } else if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        // Trick the bundler so it doesn't try to resolve or transform this require
        const pdfParse = customRequire('pdf-' + 'parse');
        const data = await pdfParse(dataBuffer);
        textContent = data.text;
      } else {
        throw new Error('Unsupported file format. Please upload PDF, TXT, or MD.');
      }

      // Very simple chunking logic (roughly by paragraphs or size)
      // In production, we'd use recursive character text splitting or semantic chunking.
      const chunks = this.chunkText(textContent, 1000);
      let chunksProcessed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim().length < 20) continue; // Skip empty/garbage chunks

        const memoryId = `doc_${Date.now()}_${i}`;
        await this.memoryManager.addMemory({
          id: memoryId,
          content: chunk,
          category: 'LEARNING_MATERIAL',
          source: path.basename(filePath),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          confidence: 1.0, // Ground truth material
          importance: 0.8,
          projectId: topic, // We repurpose projectId for topic linking here
          tags: JSON.stringify([topic, 'study-material']),
          lastAccessed: Date.now(),
          accessCount: 0
        });
        chunksProcessed++;
      }

      // Also ensure the topic exists in the learning profile
      this.memoryManager.updateTopicMastery(`topic_${topic.replace(/\\s+/g, '_').toLowerCase()}`, topic, 0);

      return { success: true, chunksProcessed };
    } catch (e: any) {
      return { success: false, chunksProcessed: 0, error: e.message };
    }
  }

  private chunkText(text: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    const sentences = text.replace(/\\n/g, ' ').split(/(?<=[.?!])\\s+/);
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxTokens) {
        chunks.push(currentChunk);
        currentChunk = sentence + ' ';
      } else {
        currentChunk += sentence + ' ';
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
}
