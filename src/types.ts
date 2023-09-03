export interface DocumentOptions {
    pathname: string;
    data: Record<string, any>,
    content: string
}

export interface ASTTextNode {
    type: 'text';
    value: string;
}

export interface ASTVariableNode {
    type: 'variable';
    reference: string;
}

export interface ASTConditionalNode {
    type: 'conditional';
    name: string;
    ifChildren: ASTNode[];
    elseChildren: ASTNode[];
}

export interface ASTDoctypeNode {
    type: 'doctype';
    value: string;
}

export interface ASTStaticAttribute {
    type: 'static';
    name: string;
    value: string;
}

export interface ASTVariableAttribute {
    type: 'variable';
    name: string;
    reference: string;
}

export interface ASTElementNode {
    type: 'element';
    name: string;
    attributes: ASTAttribute[];
    children: ASTNode[]
}

export type ASTAttribute = ASTVariableAttribute | ASTStaticAttribute;
export type ASTNode = ASTTextNode | ASTDoctypeNode | ASTElementNode | ASTVariableNode | ASTConditionalNode;

export interface ASTLayout {
    id: string;
    type: 'layout',
    tree: ASTNode[]
}

export interface ASTPage {
    type: 'document',
    pathname: string,
    layout: string;
    data: Record<string, any>
}

export type AST = ASTPage | ASTLayout;

export interface ASTTree {
    base: ASTPage;
    pages: ASTPage[];
    layout: ASTLayout;
}