import { ASTElementNode } from '../types.ts';
import { normalizeClassList } from './node-helper.ts';

export interface SourceElementContext {
	tag: string;
	staticId?: string;
	staticClasses?: string[];
	identifyingAttrs?: Record<string, string>;
}

export interface VariationEntry {
	internalKey: string;
	values: any[];
	sourceElement?: SourceElementContext;
	attrName?: string;
	suffix?: string;
	scope: string;
}

const htmlTagToSemanticName: Record<string, string[]> = {
	h1: ['heading', 'subheading'],
	h2: ['heading', 'subheading'],
	h3: ['heading', 'subheading'],
	h4: ['heading', 'subheading'],
	h5: ['heading', 'subheading'],
	h6: ['heading', 'subheading'],
	li: ['item'],
	nav: ['navigation'],
	img: ['image']
};

function formatForSSG(variable: string): string {
	return variable.replaceAll(/([\[\]\(\)%—,\-\:])+/g, '_');
}

export function extractStaticContext(element: ASTElementNode): SourceElementContext {
	const context: SourceElementContext = { tag: element.name };

	const idAttr = element.attrs['id'];
	if (idAttr?.type === 'attribute' && idAttr.value) {
		context.staticId = idAttr.value.trim();
	}

	const classAttr = element.attrs['class'];
	if (classAttr?.type === 'attribute' && classAttr.value) {
		context.staticClasses = normalizeClassList(classAttr.value);
	}

	if (element.name === 'meta') {
		const identifying: Record<string, string> = {};
		for (const attr of ['name', 'property', 'http-equiv']) {
			const a = element.attrs[attr];
			if (a?.type === 'attribute' && a.value) {
				identifying[attr] = a.value.trim();
			}
		}
		if (Object.keys(identifying).length > 0) {
			context.identifyingAttrs = identifying;
		}
	}

	if (element.name === 'link') {
		const relAttr = element.attrs['rel'];
		if (relAttr?.type === 'attribute' && relAttr.value) {
			context.identifyingAttrs = { rel: relAttr.value.trim() };
		}
	}

	return context;
}

export type ScopedNameMap = Map<string, Map<string, string>>;

export default class VariationMap {
	private scopes: Map<string, Map<string, VariationEntry>> = new Map();

	record(key: string, meta: Partial<Omit<VariationEntry, 'internalKey' | 'values'>>): void {
		const scope = meta.scope ?? '';
		if (!this.scopes.has(scope)) this.scopes.set(scope, new Map());
		const scopeMap = this.scopes.get(scope)!;

		if (!scopeMap.has(key)) {
			scopeMap.set(key, {
				internalKey: key,
				values: [],
				scope,
				...meta
			});
		} else {
			const existing = scopeMap.get(key)!;
			if (meta.attrName && !existing.attrName) existing.attrName = meta.attrName;
			if (meta.sourceElement && !existing.sourceElement)
				existing.sourceElement = meta.sourceElement;
			if (meta.suffix && !existing.suffix) existing.suffix = meta.suffix;
		}
	}

	recordValue(key: string, value: any, scope: string): void {
		const scopeMap = this.scopes.get(scope);
		if (scopeMap) {
			const entry = scopeMap.get(key);
			if (entry) {
				entry.values.push(value);
				return;
			}
		}
		for (const sm of this.scopes.values()) {
			const entry = sm.get(key);
			if (entry) {
				entry.values.push(value);
				return;
			}
		}
	}

	generateDisplayNames(): ScopedNameMap {
		const result: ScopedNameMap = new Map();
		const flatLookup = new Map<string, string>();

		const processed = new Set<string>();
		const queue = [''];

		while (queue.length > 0) {
			const scope = queue.shift()!;
			if (processed.has(scope)) continue;
			processed.add(scope);

			const scopeEntries = this.scopes.get(scope);
			if (!scopeEntries) continue;

			const parentDisplayName = scope === '' ? undefined : flatLookup.get(scope);
			const scopeNames = this.generateScopeNames(
				[...scopeEntries.values()],
				parentDisplayName
			);

			result.set(scope, scopeNames);
			for (const [internalKey, displayName] of scopeNames) {
				flatLookup.set(internalKey, displayName);
				if (this.scopes.has(internalKey)) {
					queue.push(internalKey);
				}
			}
		}

		for (const scope of this.scopes.keys()) {
			if (!processed.has(scope)) {
				const scopeEntries = this.scopes.get(scope)!;
				const parentDisplayName = flatLookup.get(scope);
				const scopeNames = this.generateScopeNames(
					[...scopeEntries.values()],
					parentDisplayName
				);
				result.set(scope, scopeNames);
				for (const [internalKey, displayName] of scopeNames) {
					flatLookup.set(internalKey, displayName);
				}
			}
		}

		return result;
	}

	private generateScopeNames(
		entries: VariationEntry[],
		parentDisplayName?: string
	): Map<string, string> {
		const result = new Map<string, string>();
		const taken = new Set<string>();

		const entriesWithCandidates = entries.map((entry) => ({
			entry,
			candidates: this.generateCandidateNames(entry)
		}));

		entriesWithCandidates.sort((a, b) => {
			const diff = a.candidates.length - b.candidates.length;
			if (diff !== 0) return diff;
			return a.entry.internalKey.localeCompare(b.entry.internalKey);
		});

		for (const { entry, candidates } of entriesWithCandidates) {
			let chosen: string | null = null;
			for (const candidate of candidates) {
				const formatted = formatForSSG(candidate);
				if (formatted && !taken.has(formatted) && formatted !== parentDisplayName) {
					chosen = formatted;
					break;
				}
			}

			if (!chosen) {
				const base = formatForSSG(candidates[0] || entry.internalKey);
				let i = 0;
				while (taken.has(`${base}_${i}`)) i++;
				chosen = `${base}_${i}`;
			}

			taken.add(chosen);
			result.set(entry.internalKey, chosen);
		}

		return result;
	}

	private generateCandidateNames(entry: VariationEntry): string[] {
		const candidates: string[] = [];
		const el = entry.sourceElement;
		const suffix = entry.suffix;
		const attrName = entry.attrName;
		const isNonRootScope = entry.scope !== '';

		if (!el) {
			candidates.push(entry.internalKey);
			return candidates;
		}

		if (attrName === 'class') {
			const stableClasses = this.findStableClasses(entry);
			const sorted = stableClasses.sort((a, b) => a.length - b.length);
			for (const cls of sorted) {
				candidates.push(`${cls}_class`);
			}
			if (el.staticClasses?.length) {
				const elSorted = [...el.staticClasses].sort((a, b) => a.length - b.length);
				for (const cls of elSorted) {
					if (!stableClasses.includes(cls)) {
						candidates.push(`${cls}_class`);
					}
				}
			}
			candidates.push(`${el.tag}_class`);
			candidates.push(entry.internalKey);
			return candidates;
		}

		if (attrName) {
			if (el.identifyingAttrs) {
				for (const value of Object.values(el.identifyingAttrs)) {
					candidates.push(value);
				}
			}
			candidates.push(attrName);
			if (el.staticId) candidates.push(`${el.staticId}_${attrName}`);
			if (el.staticClasses?.length) {
				const sorted = [...el.staticClasses].sort((a, b) => a.length - b.length);
				for (const cls of sorted) {
					candidates.push(`${cls}_${attrName}`);
				}
			}
			const semanticNames = htmlTagToSemanticName[el.tag];
			if (semanticNames) {
				for (const name of semanticNames) {
					candidates.push(`${name}_${attrName}`);
				}
			}
			candidates.push(`${el.tag}_${attrName}`);
			candidates.push(entry.internalKey);
			return candidates;
		}

		if (suffix === 'items') {
			if (el.staticId) candidates.push(`${el.staticId}_items`);
			if (el.staticClasses?.length) {
				const sorted = [...el.staticClasses].sort((a, b) => a.length - b.length);
				for (const cls of sorted) {
					candidates.push(`${cls}_items`);
				}
			}
			candidates.push('items');
			candidates.push(`${el.tag}_items`);
			candidates.push(entry.internalKey);
			return candidates;
		}

		if (suffix === 'markdown' || suffix === 'inline_markdown') {
			candidates.push(suffix);
			const semanticNames = htmlTagToSemanticName[el.tag];
			if (semanticNames) {
				candidates.push(...semanticNames);
			}
			if (el.staticId) candidates.push(el.staticId);
			if (el.staticClasses?.length) {
				const sorted = [...el.staticClasses].sort((a, b) => a.length - b.length);
				candidates.push(...sorted);
			}
			candidates.push(`${el.tag}_${suffix}`);
			candidates.push(entry.internalKey);
			return candidates;
		}

		if (isNonRootScope) {
			candidates.push('text');
		}
		const semanticNames = htmlTagToSemanticName[el.tag];
		if (semanticNames) {
			candidates.push(...semanticNames);
		}
		if (el.staticId) candidates.push(el.staticId);
		if (el.staticClasses?.length) {
			const sorted = [...el.staticClasses].sort((a, b) => a.length - b.length);
			candidates.push(...sorted);
		}
		candidates.push(el.tag);
		candidates.push(entry.internalKey);
		return candidates;
	}

	private findStableClasses(entry: VariationEntry): string[] {
		const stringValues = entry.values.filter((v): v is string => typeof v === 'string');
		if (stringValues.length === 0) {
			return entry.sourceElement?.staticClasses ?? [];
		}

		const classLists = stringValues.map((v) => normalizeClassList(v));
		return classLists.reduce((acc, list) => acc.filter((cls) => list.includes(cls)));
	}
}

export function remapData(
	data: Record<string, any>,
	scopeMap: ScopedNameMap,
	scope: string = ''
): Record<string, any> {
	const nameMap = scopeMap.get(scope);
	const result: Record<string, any> = {};
	for (const [key, value] of Object.entries(data)) {
		const newKey = nameMap?.get(key) ?? key;
		if (Array.isArray(value)) {
			result[newKey] = value.map((item) =>
				typeof item === 'object' && item !== null ? remapData(item, scopeMap, key) : item
			);
		} else if (typeof value === 'object' && value !== null) {
			result[newKey] = remapData(value, scopeMap, key);
		} else {
			result[newKey] = value;
		}
	}
	return result;
}

export function remapASTReferences(
	tree: import('../types.ts').ASTNode[],
	scopeMap: ScopedNameMap,
	scope: string = ''
): import('../types.ts').ASTNode[] {
	return tree.map((node) => remapASTNode(node, scopeMap, scope));
}

function remapReference(ref: string[], nameMap: Map<string, string> | undefined): string[] {
	if (!nameMap) return ref;
	return ref.map((part) => nameMap.get(part) ?? part);
}

function remapASTNode(
	node: import('../types.ts').ASTNode,
	scopeMap: ScopedNameMap,
	scope: string
): import('../types.ts').ASTNode {
	const nameMap = scopeMap.get(scope);
	switch (node.type) {
		case 'variable':
		case 'markdown-variable':
		case 'inline-markdown-variable':
			return { ...node, reference: remapReference(node.reference, nameMap) };
		case 'conditional': {
			const innerScope = node.reference[0];
			return {
				...node,
				reference: remapReference(node.reference, nameMap),
				template: remapASTNode(
					node.template,
					scopeMap,
					innerScope
				) as import('../types.ts').ASTElementNode
			};
		}
		case 'loop': {
			const innerScope = node.reference[0];
			return {
				...node,
				reference: remapReference(node.reference, nameMap),
				template: remapASTNode(
					node.template,
					scopeMap,
					innerScope
				) as import('../types.ts').ASTElementNode
			};
		}
		case 'element':
			return {
				...node,
				attrs: remapAttrList(node.attrs, nameMap),
				children: remapASTReferences(node.children, scopeMap, scope)
			};
		default:
			return node;
	}
}

function remapAttrList(
	attrs: import('../types.ts').ASTAttributeList,
	nameMap: Map<string, string> | undefined
): import('../types.ts').ASTAttributeList {
	const result: import('../types.ts').ASTAttributeList = {};
	for (const [key, attr] of Object.entries(attrs)) {
		if (attr.type === 'variable-attribute' || attr.type === 'conditional-attribute') {
			result[key] = {
				...attr,
				reference: remapReference(attr.reference, nameMap)
			};
		} else {
			result[key] = attr;
		}
	}
	return result;
}
