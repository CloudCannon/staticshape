export default class ExportEngine {
    options;
    constructor(options) {
        this.options = options;
    }
    staticDirectory() {
        throw new Error('Not yet implemented');
    }
    engineConfig() {
        throw new Error('Not yet implemented');
    }
    cloudCannonConfig() {
        throw new Error('Not yet implemented');
    }
    exportLayout(layout, collection, collectionKey) {
        throw new Error('Not yet implemented');
    }
    exportCollectionItem(item, collection, collectionKey) {
        throw new Error('Not yet implemented');
    }
    renderAST(tree) {
        return tree.map((node) => {
            switch (node.type) {
                case 'doctype':
                    return this.renderDoctype(node);
                case 'element':
                    return this.renderElement(node);
                case 'text':
                    return this.renderText(node);
                case 'variable':
                    return this.renderVariable(node);
                case 'conditional':
                    return this.renderConditional(node);
                case 'content':
                    return this.renderContent(node);
                default:
                    break;
            }
            throw new Error(`${node.type} render: not yet implemented`);
        }).join('');
    }
    renderDoctype(doctype) {
        return `<!DOCTYPE ${doctype.value}>`;
    }
    renderAttributes(attributes) {
        if (attributes.length === 0) {
            return '';
        }
        return ` ${attributes.map((attr) => {
            if (attr.type === 'variable') {
                throw new Error('Not yet implemented');
            }
            return [
                attr.name,
                `"${attr.value}"`
            ].join('=');
        }).join(' ')}`;
    }
    renderElement(element) {
        return `<${element.name}${this.renderAttributes(element.attributes)}>${this.renderAST(element.children)}</${element.name}>`;
    }
    renderText(text) {
        return text.value;
    }
    renderVariable(node) {
        throw new Error('Variable render not yet implemented');
    }
    renderConditional(node) {
        throw new Error('Conditional render not yet implemented');
    }
    renderContent(node) {
        throw new Error('Content render not yet implemented');
    }
}
