import { CollectionResponse } from '../collection';
import { ASTConditionalNode, ASTNode, ASTVariableNode } from '../types';
import ExportEngine, { FileExport } from './interface';
import { dump } from 'js-yaml';

function renderFrontMatter(data: Record<string, any>) {
    return `---\n${dump(data, {
        noRefs: true,
        sortKeys: true
    })}---`;
}

export default class HugoExportEngine extends ExportEngine {
    staticDirectory() : string {
        return 'static';
    }

    engineConfig() : FileExport {
        return {
            pathname: 'config.toml',
            contents: 'baseURL = \'\''
        }
    }

    cloudCannonConfig() : FileExport {
        return {
            pathname: 'cloudcannon.config.yaml',
            contents: 'todo: true'
        }
    }

    exportLayout(layout : Record<string, any>, collection : CollectionResponse, collectionKey : string) : FileExport {
        return {
            pathname: `layouts/${collectionKey}.html`,
            contents: this.renderAST(layout.tree)
        };
    }

    exportCollectionItem(item : Record<string, any>, collection : CollectionResponse, collectionKey : string) : FileExport {
        const folder = collectionKey !== 'pages'
            ? `${collectionKey}/`
            : ''

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

    renderVariable(node: ASTVariableNode) : string {
        return `{{ .Params.${node.reference} }}`;
    }

    renderConditional(node: ASTConditionalNode) : string {
        return `{{ if .Params.${node.reference} }}${this.renderAST([node.child])}{{ end }}`;
    }
}