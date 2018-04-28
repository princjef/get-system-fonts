import * as path from 'path';
import * as os from 'os';
import * as fastGlob from 'fast-glob';

const directories: { [K in NodeJS.Platform]?: () => string[]; } = {
    win32: () => {
        if (process.env.WINDIR) {
            return [path.join(process.env.WINDIR, 'Fonts')];
        } else {
            return ['C:\\Windows\\Fonts'];
        }
    },
    darwin: () => {
        const home = os.homedir();
        const userFolders = home
            ? [path.join(home, '/Library/Fonts')]
            : [];
        return [
            ...userFolders,
            '/Library/Fonts',
            '/Network/Library/Fonts',
            '/System/Library/Fonts',
            '/System Folder/Fonts'
        ];
    },
    linux: () => {
        const home = os.homedir();
        const userFolders = home
            ? [
                path.join(home, '.fonts'),
                path.join(home, '.local/share/fonts')
            ]
            : [];
        return [
            // TODO: use fontconfig to find the folder locations
            '/usr/share/fonts',
            '/usr/local/share/fonts',
            ...userFolders
        ];
    }
};

export interface Options {
    /**
     * Additional folders to search for fonts. Default: []
     */
    additionalFolders?: string[];

    /**
     * File extensions to search for. Default: ['ttf', 'otf', 'ttc', 'woff', 'woff2']
     */
    extensions?: string[];
}

/**
 * List absolute paths to all installed system fonts present.
 *
 * @param options Configuration options
 */
function getSystemFonts(options?: Options): Promise<string[]> {
    const opts: Required<Options> = {
        extensions: ['ttf', 'otf', 'ttc', 'woff', 'woff2'],
        additionalFolders: [],
        ...options
    };

    const platform = os.platform();

    const getDirs = directories[platform];
    if (!getDirs) {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const dirs = getDirs();

    return fastGlob.async(
        [...dirs, ...opts.additionalFolders]
            .map(dir => path.join(dir, `**/*.{${opts.extensions.join(',')}}`)),
        {
            followSymlinkedDirectories: true,
            onlyFiles: true,
            unique: true,
            absolute: true
        }
    );
}

module.exports = Object.assign(getSystemFonts, { default: getSystemFonts });
export default getSystemFonts;
