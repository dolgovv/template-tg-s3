// draws S3 keys as a terminal-like tree just like this:
// ---  site/
// ---  ├── Галерея/
// ---  │   └── кот.jpg
// ---  └── фото.txt

type TreeNode = {
  dirs: Map<string, TreeNode>;
  files: Set<string>;
};

export interface DrawnTree {
  text: string;
  dirs: number;
  files: number;
  // some folders were not expanded because of maxDepth
  depthLimited: boolean;
}

const BRANCH = "├── ";
const LAST = "└── ";
const PIPE = "│   ";
const SPACE = "    ";

// keys: full S3 keys under base, base: "" or "some/folder/"
export function drawTree(
  rootName: string,
  keys: string[],
  base: string,
  maxDepth: number,
): DrawnTree {
  const root = buildNodes(keys, base);
  const lines = [rootName];
  const result = { dirs: 0, files: 0, depthLimited: false };

  const render = (node: TreeNode, prefix: string, depth: number) => {
    const dirNames = [...node.dirs.keys()].sort(compareNames);
    const fileNames = [...node.files].sort(compareNames);
    const total = dirNames.length + fileNames.length;

    dirNames.forEach((name, i) => {
      const isLast = i === total - 1;
      const child = node.dirs.get(name)!;
      const hasContent = child.dirs.size > 0 || child.files.size > 0;
      const collapsed = depth >= maxDepth && hasContent;
      if (collapsed) result.depthLimited = true;

      lines.push(
        prefix + (isLast ? LAST : BRANCH) + name + "/" + (collapsed ? " …" : ""),
      );
      result.dirs++;
      if (!collapsed) render(child, prefix + (isLast ? SPACE : PIPE), depth + 1);
    });

    fileNames.forEach((name, i) => {
      const isLast = dirNames.length + i === total - 1;
      lines.push(prefix + (isLast ? LAST : BRANCH) + name);
      result.files++;
    });
  };

  render(root, "", 1);
  return { text: lines.join("\n"), ...result };
}

// "a/b/c.txt" -> a/ -> b/ -> c.txt, "a/b/" (folder marker) -> a/ -> b/
function buildNodes(keys: string[], base: string): TreeNode {
  const root = newNode();

  for (const key of keys) {
    if (!key.startsWith(base)) continue;
    const parts = key.slice(base.length).split("/");
    // "" for folder markers ("a/b/") and for the base marker itself
    const fileName = parts.pop()!;

    let node = root;
    for (const dirName of parts) {
      let child = node.dirs.get(dirName);
      if (!child) {
        child = newNode();
        node.dirs.set(dirName, child);
      }
      node = child;
    }
    if (fileName) node.files.add(fileName);
  }
  return root;
}

function newNode(): TreeNode {
  return { dirs: new Map(), files: new Set() };
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}
