import { ASTElementNode, ASTNode } from '../types';
import { nodeEquivalencyScore, loopThreshold } from './node-equivalency';

export function findRepeatedIndex(current: ASTElementNode, remainingNodes: ASTNode[]): number {
	let matchFound = false;
	for (let i = 0; i < remainingNodes.length; i++) {
		const node = remainingNodes[i];

		if (node.type === 'text') {
			if (node.value.trim()) {
				return i - 1;
			}
		} else if (node.type === 'element') {
			const score = nodeEquivalencyScore(current, node);
			if (score <= loopThreshold) {
				return i - 1;
			}
			matchFound = true;
		}
	}
	return matchFound ? remainingNodes.length : 0;
}
