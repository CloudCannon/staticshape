import ExportEngine from './interface';
import { dump } from 'js-yaml';
function renderFrontMatter(data) {
    return `---\n${dump(data, {
        noRefs: true,
        sortKeys: true
    })}---`;
}
export default class HugoExportEngine extends ExportEngine {
    staticDirectory() {
        return 'static';
    }
    engineConfig() {
        return {
            pathname: 'config.toml',
            contents: 'baseURL = \'\''
        };
    }
    cloudCannonConfig() {
        return {
            pathname: 'cloudcannon.config.yaml',
            contents: 'todo: true'
        };
    }
    exportLayout(layout, collection, collectionKey) {
        return {
            pathname: `layouts/${collectionKey}.html`,
            contents: this.renderAST(layout.tree)
        };
    }
    exportCollectionItem(item, collection, collectionKey) {
        const folder = collectionKey !== 'pages'
            ? `${collectionKey}/`
            : '';
        const frontMatter = {
            ...item.data,
            layout: collectionKey
        };
        return {
            pathname: `content/${folder}${item.pathname}`,
            contents: [
                renderFrontMatter(frontMatter),
                this.renderAST(item.content)
            ].join('\n')
        };
    }
    renderVariable(node) {
        return `{{ .Params.${node.reference} }}`;
    }
    renderConditional(node) {
        return `{{ if .Params.${node.reference} }}${this.renderAST([node.child])}{{ end }}`;
    }
    renderContent(_node) {
        // TODO support different render types (markdown vs blocks vs basic)
        return `{{ content }}`; // TODO make this the actual render
    }
}
