import { JSDOM } from 'jsdom';
import {
    ASTAttribute,
    ASTCDataNode,
    ASTCommentNode,
    ASTContentNode,
    ASTDoctypeNode,
    ASTElementNode,
    ASTNode,
    ASTTextNode,
} from '../types'
import { DocumentConfig } from '../document';

// https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
const nodeTypes = {
    1: 'element',
    2: 'attribute',
    3: 'text',
    4: 'cdata',
    7: 'PROCESSING_INSTRUCTION_NODE',
    8: 'comment',
    9: 'DOCUMENT_NODE',
    10: 'docType',
    11: 'DOCUMENT_FRAGMENT_NODE'
} as Record<number, string>;

class htmlProcessor {
    contentsSelector: string | null;
    contents: ASTNode[];

    constructor(contentsSelector?: string) {
        this.contentsSelector = contentsSelector || null;
        this.contents = [];
    }

    parse(html: string) : ASTNode[] {
        const dom = new JSDOM(html);
        const nodes = [] as ASTNode[];
        for (const node of dom.window.document.childNodes) {
            nodes.push(this.formatNode(node));
        }
        
        return nodes;
    }

    formatNode(node : Node): ASTNode {
        const type = nodeTypes[node.nodeType];
        if (type === 'text') {
            return formatTextNode(node as Text)
        }
        if (type === 'docType') {
            return formatDoctypeNode(node as DocumentType)
        }
        if (type === 'comment') {
            return formatCommentNode(node as Comment)
        }
        if (type === 'cdata') {
            return formatCDATANode(node as CDATASection)
        }
        if (type === 'element') {
            return this.formatElement(node as HTMLElement);
        }

        throw new Error(`Unsupported node type: ${type || node.nodeType}`)
    }

    formatElement(element: HTMLElement) : ASTElementNode | ASTContentNode {
        const attributes = {} as Record<string, ASTAttribute>;
        if (element.hasAttributes()) {
            for (const attr of element.attributes) {
                const formatted = formatAttribute(attr);
                attributes[formatted.name] = formatted;
            }
        }

        let children = [] as ASTNode[];
        for (const node of element.childNodes) {
            children.push(this.formatNode(node));
        }

        if (this.contentsSelector && element.matches(this.contentsSelector)) {
            if (this.contents.length > 0) {
                throw new Error("Duplicate contents parent found");
            }
            this.contents = children;
            children = [{ type: 'content' }]
        }

        return {
            type: 'element',
            name: element.localName,
            attrs: attributes,
            children: children,
        };
    }
}

interface HTMLProcessorResponse {
    layout: ASTNode[],
    contents: ASTNode[]
}

export default function htmlToAST(html: string, config: DocumentConfig) : HTMLProcessorResponse {
    const processor = new htmlProcessor(config.content?.selector);
    const layout = processor.parse(html);
    
    return {
        layout,
        contents: processor.contents
    };
}

function formatTextNode(node : Text): ASTTextNode {
    return {
        "type": 'text',
        "value": node.wholeText
    };
}

function formatAttribute(attr : Attr): ASTAttribute {
    return {
        type: 'attribute',
        name: attr.name,
        value: attr.value,
    };
}

function formatCommentNode(node : Comment): ASTCommentNode {
    return {
        "type": 'comment',
        "value": node.data || ''
    };
}

function formatDoctypeNode(node : DocumentType): ASTDoctypeNode {
    return {
        "type": 'doctype',
        "value": node?.name || 'html'
    };
}

function formatCDATANode(node : CDATASection): ASTCDataNode {
    return {
        "type": 'cdata',
        "value": node.data || ''
    };
}