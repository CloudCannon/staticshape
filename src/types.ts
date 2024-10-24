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

export interface ASTDoctypeNode {
	type: 'doctype';
	value: string;
}

export interface ASTElementNode {
	type: 'element';
	name: string;
	attrs: ASTAttributeList;
	children: ASTNode[];
}

export interface ASTConditionalNode {
	type: 'conditional';
	reference: string[];
	child: ASTElementNode;
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

export type ASTAttribute = ASTVariableAttribute | ASTStaticAttribute | ASTConditionalAttribute;
export type ASTValueNode = ASTTextNode | ASTDoctypeNode | ASTCommentNode | ASTCDataNode;
export type ASTBasicNode = ASTValueNode | ASTElementNode;
export type ASTNode =
	| ASTBasicNode
	| ASTVariableNode
	| ASTConditionalNode
	| ASTContentNode
	| ASTMarkdownNode
	| ASTInlineMarkdownNode
	| ASTLoopNode;
export type ASTAttributeList = Record<string, ASTAttribute>;
