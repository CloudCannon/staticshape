import { ASTNode } from '../types.js';
import { nodeEquivalencyScore, loopThreshold } from './node-equivalency.js';

export const invalidLoopTags: Record<string, boolean> = {
	link: true,
	meta: true,
	script: true,
	br: true,
	path: true
};

export function findRepeatedIndex(remainingNodes: ASTNode[]): number {
	let lastValidIndex = 0;
	const current = remainingNodes[0];
	for (let i = 1; i < remainingNodes.length; i++) {
		const node = remainingNodes[i];

		if (node.type === 'text') {
			if (node.value.trim()) {
				break;
			}
		} else if (node.type === 'element') {
			const score = nodeEquivalencyScore(current, node);
			if (score < loopThreshold) {
				break;
			}
			lastValidIndex = i;
		}
	}

	return lastValidIndex;
}
