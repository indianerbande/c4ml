import {
  validateLayoutRequest,
  type LayoutAdapter,
  type LayoutNodeRequest,
  type LayoutNodeResult,
  type LayoutRequest,
  type LayoutResult,
} from "@c4ml/compiler-core";

const margin = 70;
const gap = 300;
const nestedGap = 170;
const defaultPadding = 42;

interface MeasuredNode {
  readonly node: LayoutNodeRequest;
  readonly width: number;
  readonly height: number;
  readonly children: readonly MeasuredNode[];
}

export class LinearPreviewLayoutAdapter implements LayoutAdapter {
  readonly adapterId = "editor.temporary-linear-preview";

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    validateLayoutRequest(request);
    const vertical = request.direction === "down" || request.direction === "up";
    const reverse = request.direction === "left" || request.direction === "up";
    const childrenByParent = new Map<string, LayoutNodeRequest[]>();
    for (const node of request.nodes) {
      if (node.parentId === undefined) {
        continue;
      }
      const children = childrenByParent.get(node.parentId) ?? [];
      children.push(node);
      childrenByParent.set(node.parentId, children);
    }
    const roots = request.nodes.filter((node) => node.parentId === undefined);
    const orderedRoots = reverse ? [...roots].reverse() : roots;
    const measuredRoots = orderedRoots.map((node) =>
      measureNode(node, childrenByParent, vertical, reverse),
    );
    const resultById = new Map<string, LayoutNodeResult>();
    let rootCursor = margin;
    for (const root of measuredRoots) {
      const x = vertical ? margin : rootCursor;
      const y = vertical ? rootCursor : margin;
      placeNode(root, x, y, vertical, resultById);
      rootCursor += (vertical ? root.height : root.width) + gap;
    }
    const nodes = request.nodes.map((node) => resultById.get(node.id)!);
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const width = vertical
      ? Math.max(0, ...nodes.map((node) => node.width)) + margin * 2
      : Math.max(0, ...nodes.map((node) => node.x + node.width)) + margin;
    const height = vertical
      ? Math.max(0, ...nodes.map((node) => node.y + node.height)) + margin
      : Math.max(0, ...nodes.map((node) => node.height)) + margin * 2;

    return {
      requestId: request.id,
      width,
      height,
      nodes,
      edges: request.edges.map((edge) => {
        const source = nodeById.get(edge.sourceId)!;
        const target = nodeById.get(edge.targetId)!;
        return {
          id: edge.id,
          sections: [
            {
              start: center(source),
              bends: [],
              end: center(target),
            },
          ],
        };
      }),
    };
  }
}

function measureNode(
  node: LayoutNodeRequest,
  childrenByParent: ReadonlyMap<string, readonly LayoutNodeRequest[]>,
  vertical: boolean,
  reverse: boolean,
): MeasuredNode {
  const directChildren = childrenByParent.get(node.id) ?? [];
  const orderedChildren = reverse
    ? [...directChildren].reverse()
    : directChildren;
  const children = orderedChildren.map((child) =>
    measureNode(child, childrenByParent, vertical, reverse),
  );
  if (children.length === 0) {
    return { node, width: node.width, height: node.height, children };
  }

  const padding = node.padding ?? defaultPadding;
  const contentWidth = vertical
    ? Math.max(...children.map((child) => child.width))
    : children.reduce((sum, child) => sum + child.width, 0) +
      nestedGap * (children.length - 1);
  const contentHeight = vertical
    ? children.reduce((sum, child) => sum + child.height, 0) +
      nestedGap * (children.length - 1)
    : Math.max(...children.map((child) => child.height));
  return {
    node,
    width: Math.max(node.width, contentWidth + padding * 2),
    height: Math.max(node.height, contentHeight + padding * 2),
    children,
  };
}

function placeNode(
  measured: MeasuredNode,
  x: number,
  y: number,
  vertical: boolean,
  resultById: Map<string, LayoutNodeResult>,
): void {
  resultById.set(measured.node.id, {
    ...measured.node,
    width: measured.width,
    height: measured.height,
    x,
    y,
  });
  if (measured.children.length === 0) {
    return;
  }

  const padding = measured.node.padding ?? defaultPadding;
  const maxChildWidth = Math.max(
    ...measured.children.map((child) => child.width),
  );
  const maxChildHeight = Math.max(
    ...measured.children.map((child) => child.height),
  );
  let cursor = vertical ? y + padding : x + padding;
  for (const child of measured.children) {
    const childX = vertical
      ? x + padding + (maxChildWidth - child.width) / 2
      : cursor;
    const childY = vertical
      ? cursor
      : y + padding + (maxChildHeight - child.height) / 2;
    placeNode(child, childX, childY, vertical, resultById);
    cursor += (vertical ? child.height : child.width) + nestedGap;
  }
}

function center(node: LayoutNodeResult): { readonly x: number; readonly y: number } {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}
