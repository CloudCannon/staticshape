import { ASTElementNode, ASTNode } from '../types';
import { nodeEquivalencyScore, loopThreshold } from './node-equivalency';

export const invalidLoopTags: Record<string, boolean> = {
	link: true,
	meta: true,
	script: true,
	br: true,
	path: true
};

export function findRepeatedIndex(current: ASTElementNode, remainingNodes: ASTNode[]): number {
	let lastValidIndex = 0;
	for (let i = 0; i < remainingNodes.length; i++) {
		const node = remainingNodes[i];

		if (node.type === 'text') {
			if (node.value.trim()) {
				break;
			}
		} else if (node.type === 'element') {
			const score = nodeEquivalencyScore(current, node);
			if (score <= loopThreshold) {
				break;
			}
			lastValidIndex = i + 1;
		}
	}

	return lastValidIndex;
}
