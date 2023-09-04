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
    child: ASTNode;
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
