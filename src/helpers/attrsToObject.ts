import { Attribute } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';

export function attrsToObject(attrs: Attribute[]): Record<string, Attribute> {
    return attrs.reduce((memo: Record<string, Attribute>, attr: Attribute): Record<string, Attribute> => {
        memo[attr.name] = attr;
        return memo;
    }, {});
}
