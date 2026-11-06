export type SupportedLanguage = 'python3' | 'java' | 'cpp' | 'typescript' | 'javascript';

export interface LanguageOption {
  id: SupportedLanguage;
  label: string;
  extension: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'python3', label: 'Python 3', extension: '.py' },
  { id: 'java', label: 'Java', extension: '.java' },
  { id: 'cpp', label: 'C++', extension: '.cpp' },
  { id: 'typescript', label: 'TypeScript', extension: '.ts' },
  { id: 'javascript', label: 'JavaScript', extension: '.js' }
];

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

// Canonical problem templates for high-signal interview problems
const CANONICAL_TEMPLATES: Record<string, Record<SupportedLanguage, string>> = {
  'two-sum': {
    python3: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Hash Map approach: O(n) time, O(n) space
        seen = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in seen:
                return [seen[diff], i]
            seen[num] = i
        return []
`,
    java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Hash Map approach: O(n) time, O(n) space
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}
`,
    cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Hash Map approach: O(n) time, O(n) space
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};
`,
    typescript: `function twoSum(nums: number[], target: number): number[] {
    // Hash Map approach: O(n) time, O(n) space
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }
        seen.set(nums[i], i);
    }
    return [];
}
`,
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Hash Map approach: O(n) time, O(n) space
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    return [];
};
`
  },

  'contains-duplicate': {
    python3: `class Solution:
    def containsDuplicate(self, nums: list[int]) -> bool:
        # Hash Set approach: O(n) time, O(n) space
        seen = set()
        for num in nums:
            if num in seen:
                return True
            seen.add(num)
        return False
`,
    java: `import java.util.HashSet;
import java.util.Set;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        // Hash Set approach: O(n) time, O(n) space
        Set<Integer> seen = new HashSet<>();
        for (int num : nums) {
            if (!seen.add(num)) {
                return true;
            }
        }
        return false;
    }
}
`,
    cpp: `#include <vector>
#include <unordered_set>
using namespace std;

class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        // Hash Set approach: O(n) time, O(n) space
        unordered_set<int> seen;
        for (int num : nums) {
            if (seen.count(num)) return true;
            seen.insert(num);
        }
        return false;
    }
};
`,
    typescript: `function containsDuplicate(nums: number[]): boolean {
    // Hash Set approach: O(n) time, O(n) space
    const seen = new Set<number>();
    for (const num of nums) {
        if (seen.has(num)) return true;
        seen.add(num);
    }
    return false;
}
`,
    javascript: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
var containsDuplicate = function(nums) {
    // Hash Set approach: O(n) time, O(n) space
    const seen = new Set();
    for (const num of nums) {
        if (seen.has(num)) return true;
        seen.add(num);
    }
    return false;
};
`
  },

  'valid-anagram': {
    python3: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        # Frequency Counter: O(n) time, O(1) space
        if len(s) != len(t):
            return False
        count = {}
        for char in s:
            count[char] = count.get(char, 0) + 1
        for char in t:
            if char not in count or count[char] == 0:
                return False
            count[char] -= 1
        return True
`,
    java: `class Solution {
    public boolean isAnagram(String s, String t) {
        // Frequency array: O(n) time, O(1) space
        if (s.length() != t.length()) return false;
        int[] freq = new int[26];
        for (int i = 0; i < s.length(); i++) {
            freq[s.charAt(i) - 'a']++;
            freq[t.charAt(i) - 'a']--;
        }
        for (int f : freq) {
            if (f != 0) return false;
        }
        return true;
    }
}
`,
    cpp: `#include <string>
#include <vector>
using namespace std;

class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.length() != t.length()) return false;
        vector<int> freq(26, 0);
        for (char c : s) freq[c - 'a']++;
        for (char c : t) {
            if (--freq[c - 'a'] < 0) return false;
        }
        return true;
    }
};
`,
    typescript: `function isAnagram(s: string, t: string): boolean {
    if (s.length !== t.length) return false;
    const freq: Record<string, number> = {};
    for (const char of s) {
        freq[char] = (freq[char] || 0) + 1;
    }
    for (const char of t) {
        if (!freq[char]) return false;
        freq[char]--;
    }
    return true;
}
`,
    javascript: `/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
var isAnagram = function(s, t) {
    if (s.length !== t.length) return false;
    const freq = {};
    for (const char of s) {
        freq[char] = (freq[char] || 0) + 1;
    }
    for (const char of t) {
        if (!freq[char]) return false;
        freq[char]--;
    }
    return true;
};
`
  },

  'valid-parentheses': {
    python3: `class Solution:
    def isValid(self, s: str) -> bool:
        # Stack approach: O(n) time, O(n) space
        stack = []
        matching = {')': '(', '}': '{', ']': '['}
        for char in s:
            if char in matching:
                if not stack or stack[-1] != matching[char]:
                    return False
                stack.pop()
            else:
                stack.append(char)
        return len(stack) == 0
`,
    java: `import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public boolean isValid(String s) {
        // Stack approach: O(n) time, O(n) space
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}
`,
    cpp: `#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(') st.push(')');
            else if (c == '{') st.push('}');
            else if (c == '[') st.push(']');
            else if (st.empty() || st.top() != c) return false;
            else st.pop();
        }
        return st.empty();
    }
};
`,
    typescript: `function isValid(s: string): boolean {
    const stack: string[] = [];
    const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
    for (const c of s) {
        if (pairs[c]) {
            if (stack.pop() !== pairs[c]) return false;
        } else {
            stack.push(c);
        }
    }
    return stack.length === 0;
}
`,
    javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
var isValid = function(s) {
    const stack = [];
    const pairs = { ')': '(', '}': '{', ']': '[' };
    for (const c of s) {
        if (pairs[c]) {
            if (stack.pop() !== pairs[c]) return false;
        } else {
            stack.push(c);
        }
    }
    return stack.length === 0;
};
`
  },

  'best-time-to-buy-and-sell-stock': {
    python3: `class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        # One-pass greedy: O(n) time, O(1) space
        min_price = float('inf')
        max_profit = 0
        for price in prices:
            if price < min_price:
                min_price = price
            elif price - min_price > max_profit:
                max_profit = price - min_price
        return max_profit
`,
    java: `class Solution {
    public int maxProfit(int[] prices) {
        // One-pass greedy: O(n) time, O(1) space
        int minPrice = Integer.MAX_VALUE;
        int maxProfit = 0;
        for (int price : prices) {
            if (price < minPrice) {
                minPrice = price;
            } else if (price - minPrice > maxProfit) {
                maxProfit = price - minPrice;
            }
        }
        return maxProfit;
    }
}
`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = 1e9;
        int maxProfit = 0;
        for (int price : prices) {
            minPrice = min(minPrice, price);
            maxProfit = max(maxProfit, price - minPrice);
        }
        return maxProfit;
    }
};
`,
    typescript: `function maxProfit(prices: number[]): number {
    let minPrice = Infinity;
    let maxProfit = 0;
    for (const price of prices) {
        if (price < minPrice) minPrice = price;
        else if (price - minPrice > maxProfit) maxProfit = price - minPrice;
    }
    return maxProfit;
}
`,
    javascript: `/**
 * @param {number[]} prices
 * @return {number}
 */
var maxProfit = function(prices) {
    let minPrice = Infinity;
    let maxProfit = 0;
    for (const price of prices) {
        if (price < minPrice) minPrice = price;
        else if (price - minPrice > maxProfit) maxProfit = price - minPrice;
    }
    return maxProfit;
};
`
  },

  'binary-search': {
    python3: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        # Binary search: O(log n) time, O(1) space
        left, right = 0, len(nums) - 1
        while left <= right:
            mid = left + (right - left) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1
`,
    java: `class Solution {
    public int search(int[] nums, int target) {
        // Binary search: O(log n) time, O(1) space
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
`,
    cpp: `#include <vector>
using namespace std;

class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0, right = nums.size() - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
};
`,
    typescript: `function search(nums: number[], target: number): number {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}
`,
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
var search = function(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = Math.floor(left + (right - left) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
};
`
  },

  'reverse-linked-list': {
    python3: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # Iterative two pointers: O(n) time, O(1) space
        prev = None
        curr = head
        while curr:
            next_temp = curr.next
            curr.next = prev
            prev = curr
            curr = next_temp
        return prev
`,
    java: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode reverseList(ListNode head) {
        // Iterative two pointers: O(n) time, O(1) space
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode nextTemp = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nextTemp;
        }
        return prev;
    }
}
`,
    cpp: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        while (curr != nullptr) {
            ListNode* nextTemp = curr->next;
            curr->next = prev;
            prev = curr;
            curr = nextTemp;
        }
        return prev;
    }
};
`,
    typescript: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.next = (next===undefined ? null : next)
 *     }
 * }
 */

function reverseList(head: ListNode | null): ListNode | null {
    let prev: ListNode | null = null;
    let curr: ListNode | null = head;
    while (curr !== null) {
        const nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}
`,
    javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
var reverseList = function(head) {
    let prev = null;
    let curr = head;
    while (curr !== null) {
        const nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
};
`
  }
};

/**
 * Return language-specific starter boilerplate for any problem.
 */
export function getProblemBoilerplate(
  slug: string,
  title: string,
  category: string,
  language: SupportedLanguage
): string {
  const normalizedSlug = slug.toLowerCase().trim();

  // Check canonical list first
  if (CANONICAL_TEMPLATES[normalizedSlug]?.[language]) {
    return CANONICAL_TEMPLATES[normalizedSlug][language];
  }

  const methodName = toCamelCase(normalizedSlug);
  const isTree = category.toLowerCase().includes('tree');
  const isList = category.toLowerCase().includes('list');

  switch (language) {
    case 'python3': {
      let header = '';
      if (isTree) {
        header = `# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right\n\n`;
      } else if (isList) {
        header = `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next\n\n`;
      }
      return `${header}class Solution:
    def ${methodName}(self, *args, **kwargs):
        """
        Optimal implementation for ${title}
        Target Time Complexity: O(n)
        Target Space Complexity: O(1)
        """
        # TODO: Implement optimal algorithm
        pass
`;
    }

    case 'java': {
      let header = '';
      if (isTree) {
        header = `/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */\n`;
      } else if (isList) {
        header = `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */\n`;
      }
      return `${header}import java.util.*;

class Solution {
    public int ${methodName}() {
        // Optimal algorithm for "${title}"
        // Aim for optimal Big-O trade-offs
        return 0;
    }
}
`;
    }

    case 'cpp': {
      let header = '';
      if (isTree) {
        header = `/**
 * Definition for a binary tree node.
 * struct TreeNode {
 *     int val;
 *     TreeNode *left;
 *     TreeNode *right;
 *     TreeNode() : val(0), left(nullptr), right(nullptr) {}
 *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
 *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
 * };
 */\n`;
      } else if (isList) {
        header = `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */\n`;
      }
      return `${header}#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int ${methodName}() {
        // Optimal algorithm for "${title}"
        return 0;
    }
};
`;
    }

    case 'typescript': {
      let header = '';
      if (isTree) {
        header = `/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     val: number
 *     left: TreeNode | null
 *     right: TreeNode | null
 *     constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.left = (left===undefined ? null : left)
 *         this.right = (right===undefined ? null : right)
 *     }
 * }
 */\n`;
      } else if (isList) {
        header = `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.next = (next===undefined ? null : next)
 *     }
 * }
 */\n`;
      }
      return `${header}function ${methodName}(): number {
    // Optimal algorithm for "${title}"
    return 0;
}
`;
    }

    case 'javascript': {
      let header = '';
      if (isTree) {
        header = `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */\n`;
      } else if (isList) {
        header = `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */\n`;
      }
      return `${header}/**
 * Optimal implementation for ${title}
 * @return {number}
 */
var ${methodName} = function() {
    // Implement optimal algorithm here
    return 0;
};
`;
    }

    default:
      return `# Write your solution for ${title} here\ndef solution():\n    pass\n`;
  }
}

