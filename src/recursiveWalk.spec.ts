import test from 'ava';
import * as path from 'path';

import recursiveWalk from './recursiveWalk';

test('finds files directly in the given directory, excluding those with incorrect extensions', async t => {
    const dir = 'testData/shallow';
    const absDir = path.resolve(dir);

    const result = await recursiveWalk([dir], ['ttf', 'otf', 'ttc', 'woff', 'woff2']);
    t.deepEqual(
        result.sort(),
        [
            path.join(absDir, 'font.otf'),
            path.join(absDir, 'font.ttc'),
            path.join(absDir, 'font.ttf'),
            path.join(absDir, 'font.woff'),
            path.join(absDir, 'font.woff2'),
            path.join(absDir, 'other.ttf')
        ]
    );
});

test('walks recursively, capping the directory depth at 10', async t => {
    const dir = 'testData/dr1';
    const absDir = path.resolve(dir);

    const result = await recursiveWalk([dir], ['ttf']);
    t.deepEqual(
        result.sort(),
        [
            path.join(absDir, 'dr2/dr3/dr4/dr5/dr6/dr7/dr8/dr9/dr10/font.ttf'),
            path.join(absDir, 'dr2/dr3/dr4/dr5/dr6/dr7/dr8/dr9/font.ttf'),
            path.join(absDir, 'dr2/dr3/dr4/dr5/dr6/dr7/dr8/font.ttf'),
            path.join(absDir, 'dr2/dr3/dr4/dr5/dr6/dr7/font.ttf'),
            path.join(absDir, 'dr2/dr3/dr4/dr5/dr6/font.ttf'),
            path.join(absDir, 'dr2/dr3/dr4/dr5/font.ttf'),
            path.join(absDir, 'dr2/dr3/dr4/font.ttf'),
            path.join(absDir, 'dr2/dr3/font.ttf'),
            path.join(absDir, 'dr2/font.ttf'),
            path.join(absDir, 'font.ttf')
        ]
    );
});

test('ignores circular symlinks', async t => {
    t.deepEqual(
        await recursiveWalk(['testData/circular'], ['ttf']),
        [path.resolve('testData/circular/valid.ttf')]
    );
});

test('returns nothing when the provided directory is a file', async t => {
    t.deepEqual(
        await recursiveWalk(['testData/file'], ['ttf']),
        []
    );
});

test('returns nothing when the provided directory does not exist', async t => {
    t.deepEqual(
        await recursiveWalk(['testData/nonexistant'], ['ttf']),
        []
    );
});
