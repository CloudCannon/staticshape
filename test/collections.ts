import test, {ExecutionContext} from 'ava';
import Collection from "../src/collection";
import * as path from 'path';
import * as fs from 'fs';

const tests = [
    "two-pages",
    "two-pages-title-variable",
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

for (let i = 0; i < tests.length; i++) {
    const testName = tests[i];
        
    test(testName, async (t: ExecutionContext) => {
        const collection = new Collection({
            basePath: path.resolve(`./test/fixtures/collections/${testName}/files`)
        })

        const output = await collection.build();

        const expected = JSON.parse((await fs.promises.readFile(`./test/fixtures/collections/${testName}/collection.json`)).toString('utf-8'));

        t.deepEqual(output.layout, expected.layout);
        t.deepEqual(output.pages.sort(docSort), expected.pages.sort(docSort));
    });
}
