import test, {ExecutionContext} from 'ava';
import * as fs from 'fs';
import { mergeChildren } from '../src/helpers/dom-helper';
import Document, { DocumentConfig } from '../src/document';
import { Element, Node, Text } from 'angular-html-parser/lib/compiler/src/ml_parser/ast';
import { ASTNode } from '../src/types';

const documentConfig = {} as DocumentConfig;

interface TestDefinition {
    name: string;
    primary: Node[];
    secondary: Node[];
    merged: ASTNode[];
    expectedPrimaryData?: Record<string, any>;
    expectedSecondaryData?: Record<string, any>;
    expectedPrimaryContents?: ASTNode[];
    expectedSecondaryContents?: ASTNode[];
}

const tests = [
    {
        name: 'no diff',
        primary: [{
            type: 'text',
            value: 'Hi'
        } as Node],
        secondary: [{
            type: 'text',
            value: 'Hi'
        } as Node],
        merged: [{
            type: 'text',
            value: 'Hi'
        }]
    },
    {
        name: 'variable diff',
        primary: [{
            type: 'text',
            value: 'Primary'
        } as Text],
        secondary: [{
            type: 'text',
            value: 'Secondary'
        } as Text],
        merged: [{
            type: 'variable',
            reference: 'div'
        }],
        expectedPrimaryData: {
            div: 'Primary'
        },
        expectedSecondaryData: {
            div: 'Secondary'
        },
    },
    {
        name: 'conditional meta - no whitespace',
        primary: [
            {
                type: 'element',
                name: 'title',
                attrs: [],
                children: [{ type: 'text', value: 'Primary' }]
            }
        ],
        secondary: [
            {
                type: 'element',
                name: 'title',
                attrs: [],
                children: [{ type: 'text', value: 'Secondary' }]
            },
            {
                type: 'element',
                name: 'meta',
                attrs: [{ 
                    name: 'name',
                    value: 'description',
                }, { 
                    name: 'content',
                    value: 'Home',
                }],
                children: []
            }
        ],
        merged: [
            {
                type: 'element',
                name: 'title',
                attrs: [],
                children: [{ type: 'variable', reference: 'title' }]
            },
            {
                type: 'conditional',
                reference: 'show-meta_description',
                child: {
                    type: 'element',
                    name: 'meta',
                    attrs: [{ 
                        type: 'attribute',
                        name: 'name',
                        value: 'description',
                    }, { 
                        type: 'attribute',
                        name: 'content',
                        value: 'Home',
                    }],
                    children: []
                }
            }
        ],
        expectedPrimaryData: {
            title: 'Primary',
            'show-meta_description': false,
        },
        expectedSecondaryData: {
            title: 'Secondary',
            'show-meta_description': true,
        },
    },
    {
        name: 'conditional meta - with whitespace',
        primary: [
            { type: 'text', value: '\n\t\t' } as Text,
            {
                type: 'element',
                name: 'title',
                attrs: [],
                children: []
            },
            { type: 'text', value: '\n\t' } as Text
        ],
        secondary: [
            { type: 'text', value: '\n\t\t' } as Text,
            {
                type: 'element',
                name: 'title',
                attrs: [],
                children: []
            },
            { type: 'text', value: '\n\t\t' } as Text,
            {
                type: 'element',
                name: 'meta',
                attrs: [{ 
                    name: 'name',
                    value: 'description',
                }, { 
                    name: 'content',
                    value: 'Home',
                }],
                children: []
            },
            { type: 'text', value: '\n\t' } as Text
        ],
        merged: [
            { type: 'text', value: '\n\t\t' } as Text,
            {
                type: 'element',
                name: 'title',
                attrs: [],
                children: []
            },
            { type: 'text', value: '\n\t\t' },
            {
                type: 'conditional',
                reference: 'show-meta_description',
                child: {
                    type: 'element',
                    name: 'meta',
                    attrs: [{ 
                        type: 'attribute',
                        name: 'name',
                        value: 'description',
                    }, { 
                        type: 'attribute',
                        name: 'content',
                        value: 'Home',
                    }],
                    children: []
                }
            },
            { type: 'text', value: '\n\t' }
        ],
        expectedPrimaryData: {
            'show-meta_description': false,
        },
        expectedSecondaryData: {
            'show-meta_description': true,
        },
    }
] as TestDefinition[];
  
tests.forEach((def: TestDefinition) => {
    test(def.name, async (t: ExecutionContext) => {
        const config = {
            pathname: 'string',
            data: {},
            content: 'string',
            config: documentConfig
        };
    
        const primaryData = {};
        const secondaryData = {};
        const firstElement = {
            type: 'element',
            name: 'div',
            children: def.primary
        } as Element;

        const secondElement = {
            type: 'element',
            name: 'div',
            children: def.secondary
        } as Element;

        const tree = mergeChildren(documentConfig, 0, primaryData, secondaryData, firstElement, secondElement);
    
        t.deepEqual(tree, def.merged);
        t.deepEqual(primaryData, def.expectedPrimaryData || {});
        t.deepEqual(secondaryData, def.expectedSecondaryData || {});
    });
    
})