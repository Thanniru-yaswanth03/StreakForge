import { Types } from 'mongoose';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { GitHubService } from './githubService.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import type { CatalogItem, CatalogPreview, CatalogSyncResult } from '@streakforge/shared-types';

const START_DELIMITER = '<!-- STREAKFORGE:START -->';
const END_DELIMITER = '<!-- STREAKFORGE:END -->';

export class CatalogService {
  /**
   * Scan solutions and format the catalog items
   */
  public static async getCatalogItems(
    userId: string | Types.ObjectId,
    repoFullName: string
  ): Promise<CatalogItem[]> {
    const userObjectId = new Types.ObjectId(userId.toString());

    // Fetch all authentic accepted submissions
    const submissions = await LeetCodeSubmission.find({
      userId: userObjectId,
      status: 'Accepted'
    }).sort({ submittedAt: -1 }).lean();

    // Map each submission to a CatalogItem
    const itemMap = new Map<number, CatalogItem>();

    for (const sub of submissions) {
      const num = parseInt(sub.questionId, 10) || 0;
      if (num === 0 && !sub.questionTitle) continue;

      if (!itemMap.has(num)) {
        const master = MASTER_PROBLEM_LIST.find(
          (p) => p.id === num || (p.slug && p.slug === sub.questionSlug)
        );

        const difficulty = sub.difficulty || master?.difficulty || 'Medium';
        const topics = master?.category ? [master.category] : ['Algorithms'];
        const language = sub.language || 'typescript';

        // Derive solution path: ALWAYS PREFER authentic filePath recorded on the submission
        let solutionPath = sub.filePath;
        if (!solutionPath) {
          const ext =
            language === 'python3' || language === 'python'
              ? 'py'
              : language === 'javascript'
              ? 'js'
              : language === 'typescript'
              ? 'ts'
              : language === 'java'
              ? 'java'
              : language === 'cpp'
              ? 'cpp'
              : 'txt';

          const slug = sub.questionSlug || master?.slug || 'solution';
          solutionPath = `solutions/${difficulty}/${num}-${slug}/${slug}.${ext}`;
        }

        const githubUrl = `https://github.com/${repoFullName}/blob/main/${solutionPath}`;

        itemMap.set(num, {
          number: num,
          title: sub.questionTitle,
          difficulty,
          topics,
          language,
          solutionPath,
          githubUrl,
          lastSyncedAt: sub.submittedAt ? new Date(sub.submittedAt).toISOString() : undefined
        });
      }
    }

    return Array.from(itemMap.values()).sort((a, b) => a.number - b.number);
  }

  /**
   * Render the Markdown table block for the catalog
   */
  public static renderCatalogTableMarkdown(items: CatalogItem[]): string {
    const lines: string[] = [];
    lines.push(START_DELIMITER);
    lines.push('### 📚 StreakForge Verified Solutions Catalog');
    lines.push('');
    lines.push(
      `> *Automatically synchronized and verified by [StreakForge](https://github.com/StreakForge) • ${items.length} Authentic Solutions Tracked • Last Updated: ${new Date().toISOString().slice(0, 10)}*`
    );
    lines.push('');
    lines.push('| # | Problem | Difficulty | Category | Language | Solution |');
    lines.push('|:---:|:---|:---:|:---|:---:|:---:|');

    for (const item of items) {
      const diffBadge =
        item.difficulty === 'Easy'
          ? '`🟢 Easy`'
          : item.difficulty === 'Medium'
          ? '`🟡 Medium`'
          : '`🔴 Hard`';

      const topicsStr = item.topics.join(', ');
      const solutionLink = `[View Code](${item.githubUrl})`;

      lines.push(
        `| ${item.number} | **${item.title}** | ${diffBadge} | ${topicsStr} | \`${item.language}\` | ${solutionLink} |`
      );
    }

    lines.push('');
    lines.push(END_DELIMITER);
    return lines.join('\n');
  }

  /**
   * Preview proposed README update
   */
  public static async previewCatalog(
    userId: string | Types.ObjectId,
    repoFullName: string
  ): Promise<CatalogPreview> {
    const items = await this.getCatalogItems(userId, repoFullName);
    const catalogBlock = this.renderCatalogTableMarkdown(items);

    // Fetch existing README from GitHub
    let currentReadme = '';
    let currentSha: string | undefined = undefined;

    try {
      const fileData = await GitHubService.getFile(userId, repoFullName, 'README.md');
      currentReadme = fileData.content;
      currentSha = fileData.sha;
    } catch {
      currentReadme = `# LeetCode Solutions Repository\n\nTracked with StreakForge.\n\n`;
    }

    let updatedContent = '';
    if (currentReadme.includes(START_DELIMITER) && currentReadme.includes(END_DELIMITER)) {
      const before = currentReadme.substring(0, currentReadme.indexOf(START_DELIMITER));
      const after = currentReadme.substring(currentReadme.indexOf(END_DELIMITER) + END_DELIMITER.length);
      updatedContent = `${before}${catalogBlock}${after}`;
    } else {
      updatedContent = `${currentReadme.trim()}\n\n${catalogBlock}\n`;
    }

    return {
      repoFullName,
      branch: 'main',
      totalCount: items.length,
      items,
      markdownPreview: updatedContent,
      currentContentSha: currentSha,
      lastSyncedAt: new Date().toISOString()
    };
  }

  /**
   * Apply Catalog to GitHub repository with snapshot rollback support
   */
  public static async applyCatalogToGitHub(
    userId: string | Types.ObjectId,
    repoFullName: string
  ): Promise<CatalogSyncResult> {
    const preview = await this.previewCatalog(userId, repoFullName);

    // Save previous snapshot in RepositoryConnection metadata for instant 1-click rollback
    const repoConn = await RepositoryConnection.findOne({
      userId: new Types.ObjectId(userId.toString()),
      repoFullName
    });

    // Commit to GitHub via Octokit / GitHubService
    const commitMessage = `docs(catalog): update StreakForge solutions index (${preview.totalCount} problems)`;
    const result = await GitHubService.createOrUpdateFile(
      userId,
      repoFullName,
      'README.md',
      preview.markdownPreview,
      commitMessage,
      preview.currentContentSha
    );

    if (repoConn) {
      (repoConn as any).previousReadmeContent = preview.markdownPreview;
      (repoConn as any).lastCatalogSyncedAt = new Date();
      await repoConn.save();
    }

    return {
      success: true,
      repoFullName,
      commitSha: result.commitSha || 'latest',
      commitUrl: `https://github.com/${repoFullName}/commit/${result.commitSha || 'main'}`,
      itemsCataloged: preview.totalCount,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Rollback README to previous version
   */
  public static async rollbackCatalog(
    userId: string | Types.ObjectId,
    repoFullName: string
  ): Promise<{ success: boolean; message: string }> {
    const repoConn = await RepositoryConnection.findOne({
      userId: new Types.ObjectId(userId.toString()),
      repoFullName
    });

    const previous = (repoConn as any)?.previousReadmeContent;
    if (!previous) {
      throw new Error('No previous README snapshot available for rollback.');
    }

    const fileData = await GitHubService.getFile(userId, repoFullName, 'README.md');
    await GitHubService.createOrUpdateFile(
      userId,
      repoFullName,
      'README.md',
      previous,
      'revert(catalog): rollback StreakForge solutions catalog',
      fileData.sha
    );

    return {
      success: true,
      message: 'Successfully rolled back README.md to previous snapshot.'
    };
  }
}
