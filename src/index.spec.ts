import test from 'ava';
import * as sinon from 'sinon';

import * as os from 'os';
import * as path from 'path';

import getSystemFonts from '.';
import * as recursiveWalkAll from './recursiveWalk';

const win32Join = path.win32.join;
const posixJoin = path.posix.join;

function setPlatform(platform: NodeJS.Platform, homedir?: string) {
    const stubs = [
        sinon.stub(os, 'platform').returns(platform),
        sinon.stub(os, 'homedir').returns(homedir),
        sinon.stub(path, 'join')
            .callsFake(platform === 'win32' ? win32Join : posixJoin)
    ];

    return () => {
        for (const stub of stubs) {
            stub.restore();
        }
    };
}

test.beforeEach(() => {
    // NOTE: the actual behavior will not be to return the folders we provide.
    // This is only done to ease testing without being dependent on a certain
    // filesystem configuration.
    sinon.stub(recursiveWalkAll, 'default').callsFake(async dirs => dirs);
});

test.afterEach(() => {
    (recursiveWalkAll.default as sinon.SinonStub).restore();
});

test('win32: uses the value of WINDIR to find the fonts', async t => {
    const restore = setPlatform('win32');
    const originalWindir = process.env.WINDIR;
    process.env.WINDIR = 'D:\\Users\\someuser';

    try {
        t.deepEqual(
            await getSystemFonts(),
            ['D:\\Users\\someuser\\Fonts']
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            ['D:\\Users\\someuser\\Fonts'],
            ['ttf', 'otf', 'ttc', 'woff', 'woff2']
        ));
    } finally {
        restore();
        process.env.WINDIR = originalWindir;
    }
});

test('win32: falls back to C:\\Windows when WINDIR is not present', async t => {
    const restore = setPlatform('win32');
    const originalWindir = process.env.WINDIR;
    delete process.env.WINDIR;

    try {
        t.deepEqual(
            await getSystemFonts(),
            ['C:\\Windows\\Fonts']
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            ['C:\\Windows\\Fonts'],
            ['ttf', 'otf', 'ttc', 'woff', 'woff2']
        ));
    } finally {
        restore();
        process.env.WINDIR = originalWindir;
    }
});

test('darwin: includes the right paths', async t => {
    const restore = setPlatform('darwin', '/Users/someuser');

    try {
        t.deepEqual(
            await getSystemFonts(),
            [
                '/Users/someuser/Library/Fonts',
                '/Library/Fonts',
                '/Network/Library/Fonts',
                '/System/Library/Fonts',
                '/System Folder/Fonts'
            ]
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            [
                '/Users/someuser/Library/Fonts',
                '/Library/Fonts',
                '/Network/Library/Fonts',
                '/System/Library/Fonts',
                '/System Folder/Fonts'
            ],
            ['ttf', 'otf', 'ttc', 'woff', 'woff2']
        ));
    } finally {
        restore();
    }
});

test('darwin: omits folders under the home if no home is present', async t => {
    const restore = setPlatform('darwin', undefined);

    try {
        t.deepEqual(
            await getSystemFonts(),
            [
                '/Library/Fonts',
                '/Network/Library/Fonts',
                '/System/Library/Fonts',
                '/System Folder/Fonts'
            ]
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            [
                '/Library/Fonts',
                '/Network/Library/Fonts',
                '/System/Library/Fonts',
                '/System Folder/Fonts'
            ],
            ['ttf', 'otf', 'ttc', 'woff', 'woff2']
        ));
    } finally {
        restore();
    }
});

test('linux: includes the right paths', async t => {
    const restore = setPlatform('linux', '/home/someuser');

    try {
        t.deepEqual(
            await getSystemFonts(),
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts',
                '/home/someuser/.fonts',
                '/home/someuser/.local/share/fonts'
            ]
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts',
                '/home/someuser/.fonts',
                '/home/someuser/.local/share/fonts'
            ],
            ['ttf', 'otf', 'ttc', 'woff', 'woff2']
        ));
    } finally {
        restore();
    }
});

test('linux: omits folders under the home if no home is present', async t => {
    const restore = setPlatform('linux', undefined);

    try {
        t.deepEqual(
            await getSystemFonts(),
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts'
            ]
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts'
            ],
            ['ttf', 'otf', 'ttc', 'woff', 'woff2']
        ));
    } finally {
        restore();
    }
});

test('supports user-defined extension list', async t => {
    const restore = setPlatform('linux', '/home/someuser');

    try {
        t.deepEqual(
            await getSystemFonts({ extensions: ['ttf','otf'] }),
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts',
                '/home/someuser/.fonts',
                '/home/someuser/.local/share/fonts'
            ]
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts',
                '/home/someuser/.fonts',
                '/home/someuser/.local/share/fonts'
            ],
            ['ttf', 'otf']
        ));
    } finally {
        restore();
    }
});

test('throws for unsupported platforms', async t => {
    const restore = setPlatform('aix', '/Users/');
    try {
        await getSystemFonts();
        t.fail('should have thrown');
    } catch (e) {
        t.true(e instanceof Error);
    } finally {
        restore();
    }
});

test('allows extra directories to be provided', async t => {
    const restore = setPlatform('linux', '/home/someuser');

    try {
        t.deepEqual(
            await getSystemFonts({ additionalFolders: ['/some/extra/dir', '/another/dir'] }),
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts',
                '/home/someuser/.fonts',
                '/home/someuser/.local/share/fonts',
                '/some/extra/dir',
                '/another/dir'
            ]
        );

        t.true((recursiveWalkAll.default as sinon.SinonStub).calledOnceWithExactly(
            [
                '/usr/share/fonts',
                '/usr/local/share/fonts',
                '/home/someuser/.fonts',
                '/home/someuser/.local/share/fonts',
                '/some/extra/dir',
                '/another/dir'
            ],
            ['ttf', 'otf', 'ttc', 'woff', 'woff2']
        ));
    } finally {
        restore();
    }
});
