import test, {ExecutionContext} from 'ava';
import Inverser from "../src/index";
import * as path from 'path';
import * as fs from 'fs';

const tests = [
    "layouts-basic",
    "layouts-title-variable"
    // "layouts-optional-meta",
    // "layouts-different-components",
    // "layouts-different-meta-order",
    // "layouts-nav",
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
        const inverser = new Inverser({
            basePath: path.resolve(`./test/fixtures/${testName}/site`)
        })

        const ast = await inverser.build();

        const expected = JSON.parse((await fs.promises.readFile(`./test/fixtures/${testName}/ast.json`)).toString('utf-8'));

        t.deepEqual(ast.sort(docSort), expected.sort(docSort));
    });
}
