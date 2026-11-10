import { Types } from 'mongoose';
import { KnowledgeNote } from '../models/KnowledgeNote.js';
import type { KnowledgeNote as KnowledgeNoteType } from '@streakforge/shared-types';

export class KnowledgeVaultService {
  public static async listNotes(
    userId: string | Types.ObjectId,
    tag?: string,
    folder?: string,
    search?: string
  ): Promise<KnowledgeNoteType[]> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const query: any = { userId: userObjectId };

    if (tag) query.tags = tag;
    if (folder && folder !== 'All') query.folder = folder;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { content: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    let notes = await KnowledgeNote.find(query).sort({ isPinned: -1, updatedAt: -1 }).lean();

    // If vault is completely fresh, seed canonical pattern templates
    if (notes.length === 0 && !tag && !search && (!folder || folder === 'All')) {
      await this.seedDefaultNotes(userObjectId);
      notes = await KnowledgeNote.find({ userId: userObjectId }).sort({ isPinned: -1, updatedAt: -1 }).lean();
    }

    return notes.map((doc: any) => ({
      id: (doc._id as any).toString(),
      title: doc.title,
      content: doc.content,
      tags: doc.tags || [],
      folder: doc.folder || 'General',
      linkedProblemSlug: doc.linkedProblemSlug,
      isPinned: doc.isPinned || false,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    }));
  }

  public static async createNote(
    userId: string | Types.ObjectId,
    note: { title: string; content: string; tags?: string[]; folder?: string; linkedProblemSlug?: string; isPinned?: boolean }
  ): Promise<KnowledgeNoteType> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const doc = await KnowledgeNote.create({
      userId: userObjectId,
      title: note.title,
      content: note.content || '',
      tags: note.tags || [],
      folder: note.folder || 'General',
      linkedProblemSlug: note.linkedProblemSlug,
      isPinned: note.isPinned || false
    });

    return {
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      folder: doc.folder,
      linkedProblemSlug: doc.linkedProblemSlug,
      isPinned: doc.isPinned,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  public static async updateNote(
    userId: string | Types.ObjectId,
    noteId: string,
    updates: Partial<{ title: string; content: string; tags: string[]; folder: string; linkedProblemSlug: string; isPinned: boolean }>
  ): Promise<KnowledgeNoteType> {
    const userObjectId = new Types.ObjectId(userId.toString());
    const doc = await KnowledgeNote.findOneAndUpdate(
      { _id: new Types.ObjectId(noteId), userId: userObjectId },
      { $set: updates },
      { new: true }
    );
    if (!doc) throw new Error('Note not found');

    return {
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      folder: doc.folder,
      linkedProblemSlug: doc.linkedProblemSlug,
      isPinned: doc.isPinned,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString()
    };
  }

  public static async deleteNote(userId: string | Types.ObjectId, noteId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId.toString());
    await KnowledgeNote.deleteOne({ _id: new Types.ObjectId(noteId), userId: userObjectId });
  }

  private static async seedDefaultNotes(userId: Types.ObjectId): Promise<void> {
    await KnowledgeNote.insertMany([
      {
        userId,
        title: 'Sliding Window Pattern Mental Model',
        content: `### Sliding Window Strategy\n\nUse whenever the problem asks for the longest/shortest substring or subarray meeting a condition.\n\n\`\`\`javascript\nlet left = 0;\nfor (let right = 0; right < arr.length; right++) {\n  // 1. Expand right window & add to frequency state\n  state.add(arr[right]);\n  \n  // 2. Shrink left until invariant holds\n  while (windowInvalid(state)) {\n    state.remove(arr[left]);\n    left++;\n  }\n  \n  // 3. Record optimal result\n  maxLen = Math.max(maxLen, right - left + 1);\n}\n\`\`\`\n\n**Common Gotchas:**\n- Watch for 0-indexed off-by-one errors in \`right - left + 1\`.\n- When shrinking, ensure state is updated before incrementing \`left\`.`,
        tags: ['sliding-window', 'arrays', 'patterns'],
        folder: 'Patterns',
        linkedProblemSlug: 'longest-substring-without-repeating-characters',
        isPinned: true
      },
      {
        userId,
        title: 'Two Pointers & In-Place Swaps',
        content: `### Two Pointers Pattern\n\nKey scenarios:\n1. **Converging Pointers**: Sorted array, find target sum (e.g. \`Two Sum II\`, \`3Sum\`).\n2. **Fast & Slow Pointers**: Detect cycle in linked list (\`Floyd's Algorithm\`) or middle element.\n3. **Partitioning**: Dutch National Flag algorithm for \`Sort Colors\`.\n\n**Time Complexity:** Linear $O(n)$ with $O(1)$ auxiliary space.`,
        tags: ['two-pointers', 'arrays', 'algorithms'],
        folder: 'Patterns',
        linkedProblemSlug: 'two-sum',
        isPinned: true
      }
    ]);
  }
}
