import type { CurriculumProblem, CurriculumTrackId } from '@streakforge/shared-types';

export const CURRICULUM_TRACKS: Record<
  CurriculumTrackId,
  { id: CurriculumTrackId; title: string; description: string; problemCount: number }
> = {
  blind75: {
    id: 'blind75',
    title: 'Blind 75',
    description: 'The definitive 75 essential algorithmic interview questions asked by top tech companies.',
    problemCount: 75
  },
  neetcode150: {
    id: 'neetcode150',
    title: 'NeetCode 150',
    description: 'A comprehensive 150-question roadmap covering every common pattern in technical interviews.',
    problemCount: 150
  },
  topInterview150: {
    id: 'topInterview150',
    title: 'LeetCode Top Interview 150',
    description: 'The official LeetCode curated collection of the top 150 most frequently asked interview problems.',
    problemCount: 150
  }
};

export const MASTER_PROBLEM_LIST: CurriculumProblem[] = [
  // Arrays & Hashing
  { id: 1, slug: 'two-sum', title: 'Two Sum', difficulty: 'Easy', category: 'Arrays & Hashing', order: 1, leetcodeUrl: 'https://leetcode.com/problems/two-sum/' },
  { id: 217, slug: 'contains-duplicate', title: 'Contains Duplicate', difficulty: 'Easy', category: 'Arrays & Hashing', order: 2, leetcodeUrl: 'https://leetcode.com/problems/contains-duplicate/' },
  { id: 242, slug: 'valid-anagram', title: 'Valid Anagram', difficulty: 'Easy', category: 'Arrays & Hashing', order: 3, leetcodeUrl: 'https://leetcode.com/problems/valid-anagram/' },
  { id: 49, slug: 'group-anagrams', title: 'Group Anagrams', difficulty: 'Medium', category: 'Arrays & Hashing', order: 4, leetcodeUrl: 'https://leetcode.com/problems/group-anagrams/' },
  { id: 347, slug: 'top-k-frequent-elements', title: 'Top K Frequent Elements', difficulty: 'Medium', category: 'Arrays & Hashing', order: 5, leetcodeUrl: 'https://leetcode.com/problems/top-k-frequent-elements/' },
  { id: 238, slug: 'product-of-array-except-self', title: 'Product of Array Except Self', difficulty: 'Medium', category: 'Arrays & Hashing', order: 6, leetcodeUrl: 'https://leetcode.com/problems/product-of-array-except-self/' },
  { id: 36, slug: 'valid-sudoku', title: 'Valid Sudoku', difficulty: 'Medium', category: 'Arrays & Hashing', order: 7, leetcodeUrl: 'https://leetcode.com/problems/valid-sudoku/' },
  { id: 128, slug: 'longest-consecutive-sequence', title: 'Longest Consecutive Sequence', difficulty: 'Medium', category: 'Arrays & Hashing', order: 8, leetcodeUrl: 'https://leetcode.com/problems/longest-consecutive-sequence/' },
  { id: 75, slug: 'sort-colors', title: 'Sort Colors', difficulty: 'Medium', category: 'Arrays & Hashing', order: 9, leetcodeUrl: 'https://leetcode.com/problems/sort-colors/' },
  { id: 13, slug: 'roman-to-integer', title: 'Roman to Integer', difficulty: 'Easy', category: 'Arrays & Hashing', order: 10, leetcodeUrl: 'https://leetcode.com/problems/roman-to-integer/' },
  { id: 2620, slug: 'counter', title: 'Counter', difficulty: 'Easy', category: 'JavaScript / Functional', order: 11, leetcodeUrl: 'https://leetcode.com/problems/counter/' },
  { id: 169, slug: 'majority-element', title: 'Majority Element', difficulty: 'Easy', category: 'Arrays & Hashing', order: 12, leetcodeUrl: 'https://leetcode.com/problems/majority-element/' },
  { id: 189, slug: 'rotate-array', title: 'Rotate Array', difficulty: 'Medium', category: 'Arrays & Hashing', order: 13, leetcodeUrl: 'https://leetcode.com/problems/rotate-array/' },

  // Two Pointers
  { id: 125, slug: 'valid-palindrome', title: 'Valid Palindrome', difficulty: 'Easy', category: 'Two Pointers', order: 14, leetcodeUrl: 'https://leetcode.com/problems/valid-palindrome/' },
  { id: 167, slug: 'two-sum-ii-input-array-is-sorted', title: 'Two Sum II - Input Array Is Sorted', difficulty: 'Medium', category: 'Two Pointers', order: 15, leetcodeUrl: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/' },
  { id: 15, slug: '3sum', title: '3Sum', difficulty: 'Medium', category: 'Two Pointers', order: 16, leetcodeUrl: 'https://leetcode.com/problems/3sum/' },
  { id: 11, slug: 'container-with-most-water', title: 'Container With Most Water', difficulty: 'Medium', category: 'Two Pointers', order: 17, leetcodeUrl: 'https://leetcode.com/problems/container-with-most-water/' },
  { id: 42, slug: 'trapping-rain-water', title: 'Trapping Rain Water', difficulty: 'Hard', category: 'Two Pointers', order: 18, leetcodeUrl: 'https://leetcode.com/problems/trapping-rain-water/' },

  // Sliding Window
  { id: 121, slug: 'best-time-to-buy-and-sell-stock', title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', category: 'Sliding Window', order: 19, leetcodeUrl: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
  { id: 3, slug: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', category: 'Sliding Window', order: 20, leetcodeUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
  { id: 424, slug: 'longest-repeating-character-replacement', title: 'Longest Repeating Character Replacement', difficulty: 'Medium', category: 'Sliding Window', order: 21, leetcodeUrl: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
  { id: 567, slug: 'permutation-in-string', title: 'Permutation in String', difficulty: 'Medium', category: 'Sliding Window', order: 22, leetcodeUrl: 'https://leetcode.com/problems/permutation-in-string/' },
  { id: 76, slug: 'minimum-window-substring', title: 'Minimum Window Substring', difficulty: 'Hard', category: 'Sliding Window', order: 23, leetcodeUrl: 'https://leetcode.com/problems/minimum-window-substring/' },
  { id: 239, slug: 'sliding-window-maximum', title: 'Sliding Window Maximum', difficulty: 'Hard', category: 'Sliding Window', order: 24, leetcodeUrl: 'https://leetcode.com/problems/sliding-window-maximum/' },

  // Stack
  { id: 20, slug: 'valid-parentheses', title: 'Valid Parentheses', difficulty: 'Easy', category: 'Stack', order: 25, leetcodeUrl: 'https://leetcode.com/problems/valid-parentheses/' },
  { id: 155, slug: 'min-stack', title: 'Min Stack', difficulty: 'Medium', category: 'Stack', order: 26, leetcodeUrl: 'https://leetcode.com/problems/min-stack/' },
  { id: 150, slug: 'evaluate-reverse-polish-notation', title: 'Evaluate Reverse Polish Notation', difficulty: 'Medium', category: 'Stack', order: 27, leetcodeUrl: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/' },
  { id: 22, slug: 'generate-parentheses', title: 'Generate Parentheses', difficulty: 'Medium', category: 'Stack', order: 28, leetcodeUrl: 'https://leetcode.com/problems/generate-parentheses/' },
  { id: 739, slug: 'daily-temperatures', title: 'Daily Temperatures', difficulty: 'Medium', category: 'Stack', order: 29, leetcodeUrl: 'https://leetcode.com/problems/daily-temperatures/' },
  { id: 84, slug: 'largest-rectangle-in-histogram', title: 'Largest Rectangle in Histogram', difficulty: 'Hard', category: 'Stack', order: 30, leetcodeUrl: 'https://leetcode.com/problems/largest-rectangle-in-histogram/' },

  // Binary Search
  { id: 704, slug: 'binary-search', title: 'Binary Search', difficulty: 'Easy', category: 'Binary Search', order: 31, leetcodeUrl: 'https://leetcode.com/problems/binary-search/' },
  { id: 74, slug: 'search-a-2d-matrix', title: 'Search a 2D Matrix', difficulty: 'Medium', category: 'Binary Search', order: 32, leetcodeUrl: 'https://leetcode.com/problems/search-a-2d-matrix/' },
  { id: 875, slug: 'koko-eating-bananas', title: 'Koko Eating Bananas', difficulty: 'Medium', category: 'Binary Search', order: 33, leetcodeUrl: 'https://leetcode.com/problems/koko-eating-bananas/' },
  { id: 33, slug: 'search-in-rotated-sorted-array', title: 'Search in Rotated Sorted Array', difficulty: 'Medium', category: 'Binary Search', order: 34, leetcodeUrl: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
  { id: 153, slug: 'find-minimum-in-rotated-sorted-array', title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', category: 'Binary Search', order: 35, leetcodeUrl: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
  { id: 4, slug: 'median-of-two-sorted-arrays', title: 'Median of Two Sorted Arrays', difficulty: 'Hard', category: 'Binary Search', order: 36, leetcodeUrl: 'https://leetcode.com/problems/median-of-two-sorted-arrays/' },

  // Linked List
  { id: 206, slug: 'reverse-linked-list', title: 'Reverse Linked List', difficulty: 'Easy', category: 'Linked List', order: 37, leetcodeUrl: 'https://leetcode.com/problems/reverse-linked-list/' },
  { id: 21, slug: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', difficulty: 'Easy', category: 'Linked List', order: 38, leetcodeUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
  { id: 141, slug: 'linked-list-cycle', title: 'Linked List Cycle', difficulty: 'Easy', category: 'Linked List', order: 39, leetcodeUrl: 'https://leetcode.com/problems/linked-list-cycle/' },
  { id: 143, slug: 'reorder-list', title: 'Reorder List', difficulty: 'Medium', category: 'Linked List', order: 40, leetcodeUrl: 'https://leetcode.com/problems/reorder-list/' },
  { id: 19, slug: 'remove-nth-node-from-end-of-list', title: 'Remove Nth Node From End of List', difficulty: 'Medium', category: 'Linked List', order: 41, leetcodeUrl: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/' },
  { id: 138, slug: 'copy-list-with-random-pointer', title: 'Copy List with Random Pointer', difficulty: 'Medium', category: 'Linked List', order: 42, leetcodeUrl: 'https://leetcode.com/problems/copy-list-with-random-pointer/' },
  { id: 2, slug: 'add-two-numbers', title: 'Add Two Numbers', difficulty: 'Medium', category: 'Linked List', order: 43, leetcodeUrl: 'https://leetcode.com/problems/add-two-numbers/' },
  { id: 146, slug: 'lru-cache', title: 'LRU Cache', difficulty: 'Medium', category: 'Linked List', order: 44, leetcodeUrl: 'https://leetcode.com/problems/lru-cache/' },
  { id: 23, slug: 'merge-k-sorted-lists', title: 'Merge k Sorted Lists', difficulty: 'Hard', category: 'Linked List', order: 45, leetcodeUrl: 'https://leetcode.com/problems/merge-k-sorted-lists/' },

  // Trees
  { id: 226, slug: 'invert-binary-tree', title: 'Invert Binary Tree', difficulty: 'Easy', category: 'Trees', order: 46, leetcodeUrl: 'https://leetcode.com/problems/invert-binary-tree/' },
  { id: 104, slug: 'maximum-depth-of-binary-tree', title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', category: 'Trees', order: 47, leetcodeUrl: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
  { id: 543, slug: 'diameter-of-binary-tree', title: 'Diameter of Binary Tree', difficulty: 'Easy', category: 'Trees', order: 48, leetcodeUrl: 'https://leetcode.com/problems/diameter-of-binary-tree/' },
  { id: 110, slug: 'balanced-binary-tree', title: 'Balanced Binary Tree', difficulty: 'Easy', category: 'Trees', order: 49, leetcodeUrl: 'https://leetcode.com/problems/balanced-binary-tree/' },
  { id: 100, slug: 'same-tree', title: 'Same Tree', difficulty: 'Easy', category: 'Trees', order: 50, leetcodeUrl: 'https://leetcode.com/problems/same-tree/' },
  { id: 572, slug: 'subtree-of-another-tree', title: 'Subtree of Another Tree', difficulty: 'Easy', category: 'Trees', order: 51, leetcodeUrl: 'https://leetcode.com/problems/subtree-of-another-tree/' },
  { id: 235, slug: 'lowest-common-ancestor-of-a-binary-search-tree', title: 'Lowest Common Ancestor of a BST', difficulty: 'Medium', category: 'Trees', order: 52, leetcodeUrl: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/' },
  { id: 102, slug: 'binary-tree-level-order-traversal', title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', category: 'Trees', order: 53, leetcodeUrl: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
  { id: 199, slug: 'binary-tree-right-side-view', title: 'Binary Tree Right Side View', difficulty: 'Medium', category: 'Trees', order: 54, leetcodeUrl: 'https://leetcode.com/problems/binary-tree-right-side-view/' },
  { id: 1448, slug: 'count-good-nodes-in-binary-tree', title: 'Count Good Nodes in Binary Tree', difficulty: 'Medium', category: 'Trees', order: 55, leetcodeUrl: 'https://leetcode.com/problems/count-good-nodes-in-binary-tree/' },
  { id: 98, slug: 'validate-binary-search-tree', title: 'Validate Binary Search Tree', difficulty: 'Medium', category: 'Trees', order: 56, leetcodeUrl: 'https://leetcode.com/problems/validate-binary-search-tree/' },
  { id: 230, slug: 'kth-smallest-element-in-a-bst', title: 'Kth Smallest Element in a BST', difficulty: 'Medium', category: 'Trees', order: 57, leetcodeUrl: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/' },
  { id: 105, slug: 'construct-binary-tree-from-preorder-and-inorder-traversal', title: 'Construct Binary Tree from Preorder & Inorder', difficulty: 'Medium', category: 'Trees', order: 58, leetcodeUrl: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/' },
  { id: 124, slug: 'binary-tree-maximum-path-sum', title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', category: 'Trees', order: 59, leetcodeUrl: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
  { id: 297, slug: 'serialize-and-deserialize-binary-tree', title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', category: 'Trees', order: 60, leetcodeUrl: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },

  // Tries
  { id: 208, slug: 'implement-trie-prefix-tree', title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', category: 'Tries', order: 61, leetcodeUrl: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
  { id: 211, slug: 'design-add-and-search-words-data-structure', title: 'Design Add and Search Words Data Structure', difficulty: 'Medium', category: 'Tries', order: 62, leetcodeUrl: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/' },
  { id: 212, slug: 'word-search-ii', title: 'Word Search II', difficulty: 'Hard', category: 'Tries', order: 63, leetcodeUrl: 'https://leetcode.com/problems/word-search-ii/' },

  // Heap / Priority Queue
  { id: 703, slug: 'kth-largest-element-in-a-stream', title: 'Kth Largest Element in a Stream', difficulty: 'Easy', category: 'Heap / Priority Queue', order: 64, leetcodeUrl: 'https://leetcode.com/problems/kth-largest-element-in-a-stream/' },
  { id: 1046, slug: 'last-stone-weight', title: 'Last Stone Weight', difficulty: 'Easy', category: 'Heap / Priority Queue', order: 65, leetcodeUrl: 'https://leetcode.com/problems/last-stone-weight/' },
  { id: 973, slug: 'k-closest-points-to-origin', title: 'K Closest Points to Origin', difficulty: 'Medium', category: 'Heap / Priority Queue', order: 66, leetcodeUrl: 'https://leetcode.com/problems/k-closest-points-to-origin/' },
  { id: 215, slug: 'kth-largest-element-in-an-array', title: 'Kth Largest Element in an Array', difficulty: 'Medium', category: 'Heap / Priority Queue', order: 67, leetcodeUrl: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' },
  { id: 621, slug: 'task-scheduler', title: 'Task Scheduler', difficulty: 'Medium', category: 'Heap / Priority Queue', order: 68, leetcodeUrl: 'https://leetcode.com/problems/task-scheduler/' },
  { id: 295, slug: 'find-median-from-data-stream', title: 'Find Median from Data Stream', difficulty: 'Hard', category: 'Heap / Priority Queue', order: 69, leetcodeUrl: 'https://leetcode.com/problems/find-median-from-data-stream/' },

  // Backtracking
  { id: 78, slug: 'subsets', title: 'Subsets', difficulty: 'Medium', category: 'Backtracking', order: 70, leetcodeUrl: 'https://leetcode.com/problems/subsets/' },
  { id: 39, slug: 'combination-sum', title: 'Combination Sum', difficulty: 'Medium', category: 'Backtracking', order: 71, leetcodeUrl: 'https://leetcode.com/problems/combination-sum/' },
  { id: 46, slug: 'permutations', title: 'Permutations', difficulty: 'Medium', category: 'Backtracking', order: 72, leetcodeUrl: 'https://leetcode.com/problems/permutations/' },
  { id: 90, slug: 'subsets-ii', title: 'Subsets II', difficulty: 'Medium', category: 'Backtracking', order: 73, leetcodeUrl: 'https://leetcode.com/problems/subsets-ii/' },
  { id: 79, slug: 'word-search', title: 'Word Search', difficulty: 'Medium', category: 'Backtracking', order: 74, leetcodeUrl: 'https://leetcode.com/problems/word-search/' },
  { id: 131, slug: 'palindrome-partitioning', title: 'Palindrome Partitioning', difficulty: 'Medium', category: 'Backtracking', order: 75, leetcodeUrl: 'https://leetcode.com/problems/palindrome-partitioning/' },
  { id: 51, slug: 'n-queens', title: 'N-Queens', difficulty: 'Hard', category: 'Backtracking', order: 76, leetcodeUrl: 'https://leetcode.com/problems/n-queens/' },

  // Graphs
  { id: 200, slug: 'number-of-islands', title: 'Number of Islands', difficulty: 'Medium', category: 'Graphs', order: 77, leetcodeUrl: 'https://leetcode.com/problems/number-of-islands/' },
  { id: 133, slug: 'clone-graph', title: 'Clone Graph', difficulty: 'Medium', category: 'Graphs', order: 78, leetcodeUrl: 'https://leetcode.com/problems/clone-graph/' },
  { id: 695, slug: 'max-area-of-island', title: 'Max Area of Island', difficulty: 'Medium', category: 'Graphs', order: 79, leetcodeUrl: 'https://leetcode.com/problems/max-area-of-island/' },
  { id: 417, slug: 'pacific-atlantic-water-flow', title: 'Pacific Atlantic Water Flow', difficulty: 'Medium', category: 'Graphs', order: 80, leetcodeUrl: 'https://leetcode.com/problems/pacific-atlantic-water-flow/' },
  { id: 130, slug: 'surrounded-regions', title: 'Surrounded Regions', difficulty: 'Medium', category: 'Graphs', order: 81, leetcodeUrl: 'https://leetcode.com/problems/surrounded-regions/' },
  { id: 994, slug: 'rotting-oranges', title: 'Rotting Oranges', difficulty: 'Medium', category: 'Graphs', order: 82, leetcodeUrl: 'https://leetcode.com/problems/rotting-oranges/' },
  { id: 207, slug: 'course-schedule', title: 'Course Schedule', difficulty: 'Medium', category: 'Graphs', order: 83, leetcodeUrl: 'https://leetcode.com/problems/course-schedule/' },
  { id: 210, slug: 'course-schedule-ii', title: 'Course Schedule II', difficulty: 'Medium', category: 'Graphs', order: 84, leetcodeUrl: 'https://leetcode.com/problems/course-schedule-ii/' },
  { id: 684, slug: 'redundant-connection', title: 'Redundant Connection', difficulty: 'Medium', category: 'Graphs', order: 85, leetcodeUrl: 'https://leetcode.com/problems/redundant-connection/' },
  { id: 127, slug: 'word-ladder', title: 'Word Ladder', difficulty: 'Hard', category: 'Graphs', order: 86, leetcodeUrl: 'https://leetcode.com/problems/word-ladder/' },

  // 1-D Dynamic Programming
  { id: 70, slug: 'climbing-stairs', title: 'Climbing Stairs', difficulty: 'Easy', category: '1-D Dynamic Programming', order: 87, leetcodeUrl: 'https://leetcode.com/problems/climbing-stairs/' },
  { id: 746, slug: 'min-cost-climbing-stairs', title: 'Min Cost Climbing Stairs', difficulty: 'Easy', category: '1-D Dynamic Programming', order: 88, leetcodeUrl: 'https://leetcode.com/problems/min-cost-climbing-stairs/' },
  { id: 198, slug: 'house-robber', title: 'House Robber', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 89, leetcodeUrl: 'https://leetcode.com/problems/house-robber/' },
  { id: 213, slug: 'house-robber-ii', title: 'House Robber II', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 90, leetcodeUrl: 'https://leetcode.com/problems/house-robber-ii/' },
  { id: 5, slug: 'longest-palindromic-substring', title: 'Longest Palindromic Substring', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 91, leetcodeUrl: 'https://leetcode.com/problems/longest-palindromic-substring/' },
  { id: 647, slug: 'palindromic-substrings', title: 'Palindromic Substrings', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 92, leetcodeUrl: 'https://leetcode.com/problems/palindromic-substrings/' },
  { id: 91, slug: 'decode-ways', title: 'Decode Ways', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 93, leetcodeUrl: 'https://leetcode.com/problems/decode-ways/' },
  { id: 322, slug: 'coin-change', title: 'Coin Change', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 94, leetcodeUrl: 'https://leetcode.com/problems/coin-change/' },
  { id: 152, slug: 'maximum-product-subarray', title: 'Maximum Product Subarray', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 95, leetcodeUrl: 'https://leetcode.com/problems/maximum-product-subarray/' },
  { id: 139, slug: 'word-break', title: 'Word Break', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 96, leetcodeUrl: 'https://leetcode.com/problems/word-break/' },
  { id: 300, slug: 'longest-increasing-subsequence', title: 'Longest Increasing Subsequence', difficulty: 'Medium', category: '1-D Dynamic Programming', order: 97, leetcodeUrl: 'https://leetcode.com/problems/longest-increasing-subsequence/' },

  // Intervals
  { id: 57, slug: 'insert-interval', title: 'Insert Interval', difficulty: 'Medium', category: 'Intervals', order: 98, leetcodeUrl: 'https://leetcode.com/problems/insert-interval/' },
  { id: 56, slug: 'merge-intervals', title: 'Merge Intervals', difficulty: 'Medium', category: 'Intervals', order: 99, leetcodeUrl: 'https://leetcode.com/problems/merge-intervals/' },
  { id: 435, slug: 'non-overlapping-intervals', title: 'Non-overlapping Intervals', difficulty: 'Medium', category: 'Intervals', order: 100, leetcodeUrl: 'https://leetcode.com/problems/non-overlapping-intervals/' },
  { id: 252, slug: 'meeting-rooms', title: 'Meeting Rooms', difficulty: 'Easy', category: 'Intervals', order: 101, leetcodeUrl: 'https://leetcode.com/problems/meeting-rooms/' },
  { id: 253, slug: 'meeting-rooms-ii', title: 'Meeting Rooms II', difficulty: 'Medium', category: 'Intervals', order: 102, leetcodeUrl: 'https://leetcode.com/problems/meeting-rooms-ii/' }
];

export const BLIND_75_SLUGS = new Set([
  'two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams', 'top-k-frequent-elements', 'product-of-array-except-self', 'longest-consecutive-sequence',
  'valid-palindrome', '3sum', 'container-with-most-water',
  'best-time-to-buy-and-sell-stock', 'longest-substring-without-repeating-characters', 'longest-repeating-character-replacement', 'minimum-window-substring',
  'valid-parentheses',
  'find-minimum-in-rotated-sorted-array', 'search-in-rotated-sorted-array',
  'reverse-linked-list', 'merge-two-sorted-lists', 'reorder-list', 'remove-nth-node-from-end-of-list', 'linked-list-cycle', 'merge-k-sorted-lists',
  'invert-binary-tree', 'maximum-depth-of-binary-tree', 'same-tree', 'subtree-of-another-tree', 'lowest-common-ancestor-of-a-binary-search-tree', 'binary-tree-level-order-traversal', 'validate-binary-search-tree', 'kth-smallest-element-in-a-bst', 'construct-binary-tree-from-preorder-and-inorder-traversal', 'binary-tree-maximum-path-sum', 'serialize-and-deserialize-binary-tree',
  'implement-trie-prefix-tree', 'design-add-and-search-words-data-structure', 'word-search-ii',
  'find-median-from-data-stream',
  'combination-sum', 'word-search',
  'number-of-islands', 'clone-graph', 'pacific-atlantic-water-flow', 'course-schedule',
  'climbing-stairs', 'coin-change', 'longest-increasing-subsequence', 'word-break', 'house-robber', 'house-robber-ii', 'decode-ways', 'unique-paths', 'longest-common-subsequence',
  'maximum-product-subarray',
  'insert-interval', 'merge-intervals', 'non-overlapping-intervals', 'meeting-rooms', 'meeting-rooms-ii'
]);

export function getProblemsForTrack(track: CurriculumTrackId): CurriculumProblem[] {
  if (track === 'blind75') {
    return MASTER_PROBLEM_LIST.filter((p) => BLIND_75_SLUGS.has(p.slug));
  }
  return MASTER_PROBLEM_LIST;
}

