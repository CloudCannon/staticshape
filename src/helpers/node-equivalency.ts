import { distance, closest } from 'fastest-levenshtein';
import { Node, Element, Attribute } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';
import { attrsToObject } from './attrsToObject';
import { normalizeClassList } from './node-helper';

export const loopThreshold = 0.85;

export function textEquivalencyScore(first : string | null, second: string | null) : number {
    second = second || '';
    first = first || '';
    const diff = Math.abs(distance(second, first));
    if (diff === 0) {
        return 1;
    }

    const max = Math.max(second.length, first.length);
    if (diff > max) {
    }
    return 1 - (diff / max);
}

export function arrayEquivalencyScore(first : string[], second: string[]) : number {
    const max = Math.max(second.length, first.length);
    if (max === 0) {
        return 1;
    }
    let score = 0;
    const unmatched = [] as string[];
    for (let i = 0; i < first.length; i++) {
        const str = first[i];
        const index = second.indexOf(str);
        if (index >= 0) {
            second.splice(index, 1);
            score += 1;
        } else {
            unmatched.push(str);
        }
    }
    for (let i = 0; i < unmatched.length; i++) {
        const str = unmatched[i];
        const closestMatch = closest(str, second);
        if (closestMatch) {
            const index = second.indexOf(closestMatch);
            second.splice(index, 1);
            score += textEquivalencyScore(str, closestMatch);
        }
    }
    return score / max;
}

export function attributesEquivalencyScore(first : Attribute[], second: Attribute[]) : number {
    const firstAttrs = attrsToObject(first);
    const secondAttrs = attrsToObject(second);

    let max = 0;
    let score = 0;
    Object.keys(firstAttrs).forEach((attrName) => {
        max += 1;

        if (attrName === 'class') {
            score += arrayEquivalencyScore(
                normalizeClassList(firstAttrs[attrName].value),
                normalizeClassList(secondAttrs[attrName]?.value || ''),
            );
        } else {
            score += textEquivalencyScore(
                firstAttrs[attrName].value,
                secondAttrs[attrName]?.value || ''
            );
        }

        if (secondAttrs[attrName]) {
            max += 1;
            score += 1;
        }
    });
    Object.keys(secondAttrs).forEach((attrName) => {
        if (!firstAttrs[attrName]) {
            max += 1;
            score += textEquivalencyScore('', secondAttrs[attrName].value);
        }
    });

    if (max === 0) {
        return 1;
    }
    if (score === 0) {
        return 0;
    }
    return score / max;
}

export function elementEquivalencyScore(first : Element, second: Element) : number {
    if (first.name !== second.name) {
        return 0;
    }

    const attrsScores = attributesEquivalencyScore(first.attrs, second.attrs);
    // TODO children scores
    return (1 + attrsScores) / 2;
}

export function nodeEquivalencyScore(first : Node, second: Node) : number {
    if (first.type === 'element' && second.type === 'element') {
        if (first.name !== second.name) {
            return 0;
        }
        return (1 + elementEquivalencyScore(second, first)) / 2;
    }

    if ((first.type === 'text' && second.type === 'text')
        || (first.type === 'comment' && second.type === 'comment')
        || (first.type === 'docType' && second.type === 'docType')) {
        return (1 + textEquivalencyScore(second.value, first.value)) / 2;
    }

    return 0;
}

export const isBestMatch = (current : Node, other : Node, currentTree: Node[], otherTree: Node[]) => {
    const score = nodeEquivalencyScore(current, other);
    if (score === 0) {
        return false;
    }


    for (let i = 0; i < currentTree.length; i++) {
        const currentAlternative = currentTree[i];

        let alternativeScore = nodeEquivalencyScore(currentAlternative, other);
        if (alternativeScore > score) {
            return false;
        }
    }

    return true;
}