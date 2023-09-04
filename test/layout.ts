import test, {ExecutionContext} from 'ava';
import * as fs from 'fs';
import Layout from '../src/layout';

const tests = [
    "variable",
    "conditional",
]

for (let i = 0; i < tests.length; i++) {
    const testName = tests[i];
        
    test(testName, async (t: ExecutionContext) => {
        const expected = JSON.parse((await fs.promises.readFile(`./test/fixtures/layouts/${testName}/merged.json`)).toString('utf-8'));

        const a = new Layout({
            tree: JSON.parse((await fs.promises.readFile(`./test/fixtures/layouts/${testName}/a.json`)).toString('utf-8'))
        });
        const b = new Layout({
            tree: JSON.parse((await fs.promises.readFile(`./test/fixtures/layouts/${testName}/b.json`)).toString('utf-8'))
        });

        const forwards = a.merge(b);

        t.deepEqual(forwards.options.tree, expected);

        const backwards = b.merge(a);

        t.deepEqual(backwards.options.tree, expected);
    });
}
