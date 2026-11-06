import { Types } from 'mongoose';
import { LeetCodeSubmission } from '../models/LeetCodeSubmission.js';
import { StudyProgress } from '../models/StudyProgress.js';
import { MASTER_PROBLEM_LIST } from '../data/curriculaData.js';
import type { PatternItem } from '@streakforge/shared-types';

export class PatternService {
  private static CANONICAL_PATTERNS: Array<{
    name: string;
    description: string;
    typicalTimeComplexity: string;
    coreTechnique: string;
    matchCategories: string[];
    sampleSlugs: string[];
  }> = [
    {
      name: 'Two Pointers',
      description: 'Two pointers converging from opposite ends or moving at coordinated paces.',
      typicalTimeComplexity: 'O(n)',
      coreTechnique: 'Sorted arrays, pair sums, in-place partitions, palindrome validation.',
      matchCategories: ['Two Pointers'],
      sampleSlugs: ['two-sum-ii-input-array-is-sorted', '3sum', 'container-with-most-water']
    },
    {
      name: 'Sliding Window',
      description: 'Dynamic or fixed-size subarray/substring window that expands and shrinks monotonically.',
      typicalTimeComplexity: 'O(n)',
      coreTechnique: 'Longest/shortest contiguous subarray meeting target sum or character constraint.',
      matchCategories: ['Sliding Window'],
      sampleSlugs: ['best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters', 'minimum-window-substring']
    },
    {
      name: 'Prefix Sum & Hashing',
      description: 'Precomputing cumulative sums or frequency tables to enable O(1) query lookups.',
      typicalTimeComplexity: 'O(n)',
      coreTechnique: 'Subarray sum equals K, complement matching, anagram frequency hashing.',
      matchCategories: ['Arrays & Hashing'],
      sampleSlugs: ['two-sum', 'product-of-array-except-self', 'longest-consecutive-sequence']
    },
    {
      name: 'Binary Search',
      description: 'Logarithmic search space halving over sorted arrays or monotonic answer spaces.',
      typicalTimeComplexity: 'O(log n)',
      coreTechnique: 'Search in rotated array, finding boundary conditions, search on answer.',
      matchCategories: ['Binary Search'],
      sampleSlugs: ['binary-search', 'search-a-2d-matrix', 'find-minimum-in-rotated-sorted-array']
    },
    {
      name: 'Fast & Slow Pointers',
      description: "Floyd's cycle-finding algorithm using two pointers moving at speeds of 1 and 2.",
      typicalTimeComplexity: 'O(n)',
      coreTechnique: 'Cycle detection in linked lists, finding middle element, duplicate integer in array.',
      matchCategories: ['Linked List'],
      sampleSlugs: ['linked-list-cycle', 'middle-of-the-linked-list']
    },
    {
      name: 'Linked List In-Place Reversal',
      description: 'Iteratively re-pointing node references without allocating auxiliary memory.',
      typicalTimeComplexity: 'O(n)',
      coreTechnique: 'Previous, current, and next pointer manipulation.',
      matchCategories: ['Linked List'],
      sampleSlugs: ['reverse-linked-list', 'reorder-list']
    },
    {
      name: 'Monotonic Stack',
      description: 'Stack enforcing monotonic strictly increasing or decreasing order.',
      typicalTimeComplexity: 'O(n)',
      coreTechnique: 'Next greater element, daily temperatures, largest rectangle in histogram.',
      matchCategories: ['Stack'],
      sampleSlugs: ['daily-temperatures', 'largest-rectangle-in-histogram']
    },
    {
      name: 'Heap / Priority Queue',
      description: 'Min-heap or max-heap maintaining top-K extreme elements in logarithmic updates.',
      typicalTimeComplexity: 'O(n log k)',
      coreTechnique: 'Kth largest element, merge K sorted lists, median from data stream.',
      matchCategories: ['Heap / Priority Queue'],
      sampleSlugs: ['kth-largest-element-in-an-array', 'top-k-frequent-elements']
    },
    {
      name: 'Tree Traversal (BFS & DFS)',
      description: 'Level-order queue traversal (BFS) and recursive post/pre/in-order trees (DFS).',
      typicalTimeComplexity: 'O(V + E)',
      coreTechnique: 'Maximum depth, inverted binary tree, validate BST, lowest common ancestor.',
      matchCategories: ['Trees'],
      sampleSlugs: ['maximum-depth-of-binary-tree', 'invert-binary-tree', 'lowest-common-ancestor-of-a-binary-search-tree']
    },
    {
      name: 'Graph Traversal (BFS / DFS / Matrix)',
      description: 'Island exploration, connected components, and shortest path in unweighted graphs.',
      typicalTimeComplexity: 'O(V + E)',
      coreTechnique: 'Visited set tracking, matrix 4-directional boundary exploration, cycle detection.',
      matchCategories: ['Graphs'],
      sampleSlugs: ['number-of-islands', 'clone-graph', 'course-schedule']
    },
    {
      name: 'Backtracking',
      description: 'Depth-first search exploring solution state space with state restoration upon backtrack.',
      typicalTimeComplexity: 'O(2^n) or O(n!)',
      coreTechnique: 'Subsets, permutations, combination sum, word search on board.',
      matchCategories: ['Backtracking'],
      sampleSlugs: ['subsets', 'combination-sum', 'word-search']
    },
    {
      name: '1-D & 2-D Dynamic Programming',
      description: 'Decomposing optimal substructure into memoized subproblem overlapping states.',
      typicalTimeComplexity: 'O(n) to O(m*n)',
      coreTechnique: 'Climbing stairs, coin change, longest increasing subsequence, 0/1 knapsack.',
      matchCategories: ['Dynamic Programming', '1-D Dynamic Programming', '2-D Dynamic Programming'],
      sampleSlugs: ['climbing-stairs', 'coin-change', 'longest-increasing-subsequence']
    },
    {
      name: 'Trie (Prefix Tree)',
      description: 'Tree data structure optimized for fast prefix lookup and autocomplete in strings.',
      typicalTimeComplexity: 'O(L) per word',
      coreTechnique: 'Character branching, end-of-word boolean flags.',
      matchCategories: ['Tries'],
      sampleSlugs: ['implement-trie-prefix-tree', 'design-add-and-search-words-data-structure']
    },
    {
      name: 'Bit Manipulation',
      description: 'Bitwise operations (XOR, AND, shifts) for constant-time bitwise transformations.',
      typicalTimeComplexity: 'O(1)',
      coreTechnique: 'Single number isolation via XOR, counting set bits, bitwise parity checks.',
      matchCategories: ['Bit Manipulation'],
      sampleSlugs: ['single-number', 'number-of-1-bits', 'counting-bits']
    }
  ];

  public static async getPatternsOverview(userId: string | Types.ObjectId): Promise<PatternItem[]> {
    const userObjectId = new Types.ObjectId(userId.toString());

    // Fetch user solved problem slugs
    const [progressDocs, submissions] = await Promise.all([
      StudyProgress.find({ userId: userObjectId }).lean(),
      LeetCodeSubmission.find({ userId: userObjectId, syncStatus: 'SYNCED' }).lean()
    ]);

    const solvedSlugs = new Set<string>();
    progressDocs.forEach((p) => {
      if (p.status === 'SOLVED' || p.status === 'MASTERED' || p.status === 'NEEDS_REVISION') {
        solvedSlugs.add(p.questionSlug.toLowerCase());
      }
    });
    submissions.forEach((s) => solvedSlugs.add(s.questionSlug.toLowerCase()));

    return this.CANONICAL_PATTERNS.map((pattern) => {
      // Find all master problems belonging to this pattern
      const matchedProblems = MASTER_PROBLEM_LIST.filter((p) =>
        pattern.matchCategories.includes(p.category)
      );

      const problemCount = matchedProblems.length || 6;
      const solvedCount = matchedProblems.filter((p) => solvedSlugs.has(p.slug.toLowerCase())).length;

      let masteryLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER';
      if (solvedCount >= 3) masteryLevel = 'ADVANCED';
      else if (solvedCount >= 1) masteryLevel = 'INTERMEDIATE';

      const exampleProblems = matchedProblems.slice(0, 3).map((p) => ({
        title: p.title,
        slug: p.slug,
        difficulty: p.difficulty
      }));

      return {
        name: pattern.name,
        description: pattern.description,
        problemCount,
        solvedCount,
        masteryLevel,
        typicalTimeComplexity: pattern.typicalTimeComplexity,
        coreTechnique: pattern.coreTechnique,
        exampleProblems
      };
    });
  }
}

