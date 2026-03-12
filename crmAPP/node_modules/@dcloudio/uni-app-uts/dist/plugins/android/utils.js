"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniCloudObjectInfo = exports.getUniCloudSpaceList = exports.parseUTSImportFilename = exports.parseUTSRelativeFilename = exports.stringifyMap = exports.isVue = exports.tscOutDir = exports.uvueOutDir = exports.kotlinOutDir = exports.createResolveError = exports.parseImports = exports.createTryResolve = exports.wrapResolve = exports.ENTRY_FILENAME = exports.DEFAULT_APPID = exports.UVUE_CLASS_NAME_PREFIX = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const es_module_lexer_1 = require("es-module-lexer");
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const shared_1 = require("@vue/shared");
const errors_1 = require("./uvue/compiler/errors");
exports.UVUE_CLASS_NAME_PREFIX = 'Gen';
exports.DEFAULT_APPID = '__UNI__uniappx';
const ENTRY_FILENAME = () => process.env.UNI_APP_X_TSC === 'true' ? 'main.uts.ts' : 'main.uts';
exports.ENTRY_FILENAME = ENTRY_FILENAME;
function wrapResolve(resolve) {
    return async (source, importer, options) => {
        try {
            return await resolve(source, importer, options);
        }
        catch (e) {
            // import "@/pages/logo.png" 可能会报 Cannot find module 错误
        }
        return null;
    };
}
exports.wrapResolve = wrapResolve;
function createTryResolve(importer, resolve, offsetStart, origCode = '') {
    return async (source, code, { ss, se }) => {
        const resolved = await wrapResolve(resolve)(source, importer);
        if (!resolved) {
            const { start, end } = (0, uni_cli_shared_1.offsetToStartAndEnd)(code, ss, se);
            if (offsetStart) {
                if (start.line === 1) {
                    start.column = start.column + offsetStart.column;
                    if (end.line === 1) {
                        end.column = end.column + offsetStart.column;
                    }
                }
                const offsetLine = offsetStart.line - 1;
                start.line = start.line + offsetLine;
                end.line = end.line + offsetLine;
            }
            throw createResolveError(origCode || code, (0, uni_cli_shared_1.createResolveErrorMsg)(source, importer), start, end);
        }
    };
}
exports.createTryResolve = createTryResolve;
async function parseImports(code, tryResolve) {
    await es_module_lexer_1.init;
    let res = [[], [], false, false];
    try {
        res = (0, es_module_lexer_1.parse)(code);
    }
    catch (err) {
        const message = err.message;
        if (message) {
            const matches = message.match(/@:(\d+):(\d+)/);
            if (matches) {
                throw (0, uni_cli_shared_1.createRollupError)('', '', (0, errors_1.createCompilerError)(0, {
                    start: {
                        offset: 0,
                        line: parseInt(matches[1]),
                        column: parseInt(matches[2]),
                    },
                }, { 0: `Parse error` }, ''), code);
            }
        }
        throw err;
    }
    const imports = res[0];
    const importsCode = [];
    for (const specifier of imports) {
        const source = code.slice(specifier.s, specifier.e);
        if (tryResolve) {
            const res = await tryResolve(source, code, specifier);
            if (res === false) {
                // 忽略该import
                continue;
            }
        }
        importsCode.push(`import "${source}"`);
    }
    return importsCode.concat(parseUniExtApiImports(code)).join('\n');
}
exports.parseImports = parseImports;
function createResolveError(code, msg, start, end) {
    return (0, uni_cli_shared_1.createRollupError)('', '', (0, errors_1.createCompilerError)(0, {
        start,
        end,
    }, { 0: msg }, ''), code);
}
exports.createResolveError = createResolveError;
// @ts-expect-error 暂时不用
function genImportsCode(code, imports) {
    const chars = code.split('');
    const keepChars = [];
    imports.forEach(({ ss, se }) => {
        for (let i = ss; i <= se; i++) {
            keepChars.push(i);
        }
    });
    for (let i = 0; i < chars.length; i++) {
        if (!keepChars.includes(i)) {
            const char = chars[i];
            if (char !== '\r' && char !== '\n') {
                chars[i] = ' ';
            }
        }
    }
    return chars.join('');
}
function parseUniExtApiImports(code) {
    if (!process.env.UNI_UTS_PLATFORM) {
        return [];
    }
    const extApis = (0, uni_cli_shared_1.parseUniExtApiNamespacesJsOnce)(process.env.UNI_UTS_PLATFORM, process.env.UNI_UTS_TARGET_LANGUAGE);
    const pattern = /uni\.(\w+)/g;
    const apis = new Set();
    let match;
    while ((match = pattern.exec(code)) !== null) {
        apis.add(match[1]);
    }
    const imports = [];
    apis.forEach((api) => {
        const extApi = extApis[api];
        if (extApi) {
            imports.push(`import "${extApi[0]}"`);
        }
    });
    return imports;
}
function kotlinOutDir() {
    return path_1.default.join(process.env.UNI_OUTPUT_DIR, '../.kotlin');
}
exports.kotlinOutDir = kotlinOutDir;
function uvueOutDir() {
    return path_1.default.join(process.env.UNI_OUTPUT_DIR, '../.uvue');
}
exports.uvueOutDir = uvueOutDir;
function tscOutDir() {
    return path_1.default.join(process.env.UNI_OUTPUT_DIR, '../.tsc');
}
exports.tscOutDir = tscOutDir;
function isVue(filename) {
    return filename.endsWith('.vue') || filename.endsWith('.uvue');
}
exports.isVue = isVue;
function stringifyMap(obj, ts = false) {
    return serialize(obj, ts);
}
exports.stringifyMap = stringifyMap;
function serialize(obj, ts = false) {
    if ((0, shared_1.isString)(obj)) {
        return `"${obj}"`;
    }
    else if ((0, shared_1.isPlainObject)(obj)) {
        const entries = Object.entries(obj).map(([key, value]) => `[${serialize(key, ts)},${serialize(value, ts)}]`);
        if (entries.length) {
            return `utsMapOf([${entries.join(',')}])`;
        }
        if (ts) {
            return `utsMapOf<string, any | null>()`;
        }
        return `utsMapOf()`;
    }
    else if ((0, shared_1.isArray)(obj)) {
        return `[${obj.map((item) => serialize(item, ts)).join(',')}]`;
    }
    else {
        return String(obj);
    }
}
function parseUTSRelativeFilename(filename, root) {
    if (!path_1.default.isAbsolute(filename)) {
        return filename;
    }
    return (0, uni_cli_shared_1.normalizeNodeModules)(path_1.default.relative(root ?? process.env.UNI_INPUT_DIR, filename));
}
exports.parseUTSRelativeFilename = parseUTSRelativeFilename;
function parseUTSImportFilename(filename) {
    if (!path_1.default.isAbsolute(filename)) {
        return filename;
    }
    return (0, uni_cli_shared_1.normalizePath)(path_1.default.join(process.env.UNI_APP_X_TSC === 'true' ? tscOutDir() : uvueOutDir(), (0, uni_cli_shared_1.normalizeNodeModules)(path_1.default.relative(process.env.UNI_INPUT_DIR, filename))));
}
exports.parseUTSImportFilename = parseUTSImportFilename;
let uniCloudSpaceList;
function getUniCloudSpaceList() {
    if (uniCloudSpaceList) {
        return uniCloudSpaceList;
    }
    if (!process.env.UNI_CLOUD_SPACES) {
        uniCloudSpaceList = [];
        return uniCloudSpaceList;
    }
    try {
        const spaces = JSON.parse(process.env.UNI_CLOUD_SPACES);
        if (!Array.isArray(spaces)) {
            uniCloudSpaceList = [];
            return uniCloudSpaceList;
        }
        uniCloudSpaceList = spaces.map((space) => {
            if (space.provider === 'tcb') {
                space.provider = 'tencent';
            }
            if (!space.provider && space.clientSecret) {
                space.provider = 'aliyun';
            }
            switch (space.provider) {
                case 'aliyun':
                case 'dcloud':
                    return {
                        provider: space.provider || 'aliyun',
                        spaceName: space.name,
                        spaceId: space.id,
                        clientSecret: space.clientSecret,
                        endpoint: space.apiEndpoint,
                        workspaceFolder: space.workspaceFolder,
                    };
                case 'alipay': {
                    return {
                        provider: space.provider,
                        spaceName: space.name,
                        spaceId: space.id,
                        spaceAppId: space.spaceAppId,
                        accessKey: space.accessKey,
                        secretKey: space.secretKey,
                        workspaceFolder: space.workspaceFolder,
                    };
                }
                case 'tencent':
                default: {
                    return {
                        provider: space.provider,
                        spaceName: space.name,
                        spaceId: space.id,
                        workspaceFolder: space.workspaceFolder,
                    };
                }
            }
        });
    }
    catch (e) {
        console.error(e);
    }
    uniCloudSpaceList = uniCloudSpaceList || [];
    if (uniCloudSpaceList.length > 1) {
        console.warn('Multi uniCloud space is not supported yet.');
    }
    return uniCloudSpaceList;
}
exports.getUniCloudSpaceList = getUniCloudSpaceList;
function getUniCloudObjectInfo(uniCloudSpaceList) {
    let uniCloudWorkspaceFolder = process.env.UNI_INPUT_DIR.endsWith('src')
        ? path_1.default.resolve(process.env.UNI_INPUT_DIR, '..')
        : process.env.UNI_INPUT_DIR;
    let serviceProvider = 'aliyun';
    if (uniCloudSpaceList && uniCloudSpaceList.length > 0) {
        const space = uniCloudSpaceList[0];
        if (space.workspaceFolder) {
            uniCloudWorkspaceFolder = space.workspaceFolder;
        }
        serviceProvider = space.provider === 'tencent' ? 'tcb' : space.provider;
    }
    else {
        serviceProvider =
            ['aliyun', 'tcb', 'alipay', 'dcloud'].find((item) => fs_1.default.existsSync(path_1.default.resolve(uniCloudWorkspaceFolder, 'uniCloud-' + item))) || 'aliyun';
    }
    try {
        const { getWorkspaceObjectInfo } = require('../../../lib/unicloud-utils');
        return getWorkspaceObjectInfo(uniCloudWorkspaceFolder, serviceProvider);
    }
    catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
exports.getUniCloudObjectInfo = getUniCloudObjectInfo;
// export const initAutoImportOnce = once(initAutoImport)
// function initAutoImport(autoImportOptions?: AutoImportOptions) {
//   const options = initAutoImportOptions(
//     process.env.UNI_UTS_PLATFORM,
//     autoImportOptions || {}
//   )
//   if ((options.imports as any[]).length === 0) {
//     return {
//       transform(code: string, id: string) {
//         return { code }
//       },
//     }
//   }
//   const autoImport = AutoImport(options) as {
//     transform(
//       code: string,
//       id: string
//     ): Promise<{ code: string; map?: SourceMapInput }>
//   }
//   const { transform } = autoImport
//   autoImport.transform = async function (code, id) {
//     const result = await transform.call(this, code, id)
//     if (result) {
//       return result
//     }
//     return { code }
//   }
//   return autoImport
// }
