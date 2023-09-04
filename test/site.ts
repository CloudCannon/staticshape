import test, {ExecutionContext} from 'ava';
import Site from "../src/site";
import * as path from 'path';
import * as fs from 'fs';

const tests = [
    "two-pages",
    "two-pages-title-variable",
    "two-pages-body-content",
    "three-pages",
    "three-pages-title-variable",
]

function docSort(a, b) {
    const nameA = (a.pathname || a.id);
    const nameB = (b.pathname || b.id);
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
  
    return 0;
}

function sortCollectionPages(collections) {
    Object.keys(collections).forEach((key) => {
        const collection = collections[key];
        collection.pages = collection.pages.sort(docSort);
    })
} 

for (let i = 0; i < tests.length; i++) {
    const testName = tests[i];
        
    test(testName, async (t: ExecutionContext) => {
        const basePath = path.resolve(`./test/fixtures/sites/${testName}/files`);
        const config = JSON.parse((await fs.promises.readFile(`./test/fixtures/sites/${testName}/config.json`)).toString('utf-8'));
        const site = new Site({
            basePath,
            ...config,
        })

        const output = await site.build();
        const expected = JSON.parse((await fs.promises.readFile(`./test/fixtures/sites/${testName}/collection.json`)).toString('utf-8'));
        sortCollectionPages(output.collections);
        sortCollectionPages(expected);
        t.deepEqual(output.collections, expected);
    });
}
