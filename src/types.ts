export interface DocumentOptions {
	pathname: string;
	data: Record<string, any>;
	content: string;
}

export interface ASTTextNode {
	type: 'text';
	value: string;
}

export interface ASTCommentNode {
	type: 'comment';
	value: string;
}

export interface ASTCDataNode {
	type: 'cdata';
	value: string;
}

export interface ASTVariableNode {
	type: 'variable';
	reference: string[];
}

export interface ASTConditionalNode {
	type: 'conditional';
	reference: string[];
	child: ASTBasicNode;
}

export interface ASTDoctypeNode {
	type: 'doctype';
	value: string;
}

export interface ASTContentNode {
	type: 'content';
}

export interface ASTStaticAttribute {
	type: 'attribute';
	name: string;
	value: string;
}

export interface ASTVariableAttribute {
	type: 'variable-attribute';
	name: string;
	reference: string[];
}

export interface ASTConditionalAttribute {
	type: 'conditional-attribute';
	name: string;
	reference: string[];
}

export interface ASTMarkdownNode {
	type: 'markdown-variable';
	reference: string[];
}

export interface ASTInlineMarkdownNode {
	type: 'inline-markdown-variable';
	reference: string[];
}

export interface ASTLoopNode {
	type: 'loop';
	reference: string[];
	template: ASTElementNode;
}

export interface ASTElementNode {
	type: 'element';
	name: string;
	attrs: ASTAttributeList;
	children: ASTNode[];
}

export type ASTAttribute = ASTVariableAttribute | ASTStaticAttribute | ASTConditionalAttribute;
export type ASTValueNode = ASTTextNode | ASTDoctypeNode | ASTCommentNode | ASTCDataNode;
export type ASTBasicNode = ASTValueNode | ASTElementNode;
export type ASTVaraibleNode =
	| ASTVariableNode
	| ASTConditionalNode
	| ASTContentNode
	| ASTMarkdownNode
	| ASTInlineMarkdownNode
	| ASTLoopNode;
export type ASTNode = ASTBasicNode | ASTVaraibleNode;
export type ASTAttributeList = Record<string, ASTAttribute>;
