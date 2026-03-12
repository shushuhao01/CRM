"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniAppPlugin = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const utils_1 = require("./utils");
const manifestJson_1 = require("./manifestJson");
const utils_2 = require("../utils");
const __1 = require("../..");
const uniCloudSpaceList = (0, utils_1.getUniCloudSpaceList)();
let isFirst = true;
function uniAppPlugin() {
    const inputDir = process.env.UNI_INPUT_DIR;
    const outputDir = process.env.UNI_OUTPUT_DIR;
    const mainUTS = (0, uni_cli_shared_1.resolveMainPathOnce)(inputDir);
    const uvueOutputDir = (0, utils_1.uvueOutDir)();
    const tscOutputDir = (0, utils_1.tscOutDir)();
    const manifestJson = (0, uni_cli_shared_1.parseManifestJsonOnce)(inputDir);
    // 预留一个口子，方便切换测试
    const split = manifestJson['uni-app-x']?.split;
    // 开始编译时，清空输出目录
    function emptyOutDir() {
        if (fs_extra_1.default.existsSync(outputDir)) {
            (0, uni_cli_shared_1.emptyDir)(outputDir);
        }
    }
    emptyOutDir();
    function emptyUVueDir() {
        if (fs_extra_1.default.existsSync(uvueOutputDir)) {
            (0, uni_cli_shared_1.emptyDir)(uvueOutputDir);
        }
    }
    emptyUVueDir();
    function emptyTscDir() {
        if (fs_extra_1.default.existsSync(tscOutputDir)) {
            (0, uni_cli_shared_1.emptyDir)(tscOutputDir);
        }
    }
    emptyTscDir();
    return {
        name: 'uni:app-uts',
        apply: 'build',
        uni: (0, utils_2.createUniOptions)('android'),
        config() {
            return {
                base: '/', // 强制 base
                build: {
                    outDir: process.env.UNI_APP_X_TSC === 'true' ? (0, utils_1.tscOutDir)() : (0, utils_1.uvueOutDir)(),
                    lib: {
                        // 必须使用 lib 模式
                        fileName: 'output',
                        entry: (0, uni_cli_shared_1.resolveMainPathOnce)(inputDir),
                        formats: ['cjs'],
                    },
                    rollupOptions: {
                        external(source) {
                            if (['vue', 'vuex', 'pinia', '@dcloudio/uni-app'].includes(source)) {
                                return true;
                            }
                            // 相对目录
                            if (source.startsWith('@/') || source.startsWith('.')) {
                                return false;
                            }
                            if (path_1.default.isAbsolute(source)) {
                                return false;
                            }
                            // android 系统库，三方库，iOS 的库呢？一般不包含.
                            if (source.includes('.')) {
                                return true;
                            }
                            return false;
                        },
                        output: {
                            chunkFileNames(chunk) {
                                // if (chunk.isDynamicEntry && chunk.facadeModuleId) {
                                //   const { filename } = parseVueRequest(chunk.facadeModuleId)
                                //   if (filename.endsWith('.nvue')) {
                                //     return (
                                //       removeExt(
                                //         normalizePath(path.relative(inputDir, filename))
                                //       ) + '.js'
                                //     )
                                //   }
                                // }
                                return '[name].js';
                            },
                        },
                    },
                },
            };
        },
        configResolved(config) {
            (0, utils_2.configResolved)(config, true);
        },
        async transform(code, id) {
            const { filename } = (0, uni_cli_shared_1.parseVueRequest)(id);
            if (!filename.endsWith('.uts') && !filename.endsWith('.ts')) {
                return;
            }
            // 仅处理 uts 文件
            // 忽略 uni-app-uts/lib/automator/index.uts
            if (!filename.includes('uni-app-uts')) {
                const isMainUTS = (0, uni_cli_shared_1.normalizePath)(id) === mainUTS;
                const fileName = path_1.default.relative(inputDir, id);
                this.emitFile({
                    type: 'asset',
                    fileName: (0, uni_cli_shared_1.normalizeEmitAssetFileName)(normalizeFilename(fileName, isMainUTS)),
                    source: normalizeCode(code, isMainUTS),
                });
            }
            code = await (0, utils_1.parseImports)(code, (0, utils_1.createTryResolve)(id, this.resolve.bind(this)));
            return code;
        },
        generateBundle(_, bundle) {
            if (process.env.UNI_COMPILE_TARGET === 'uni_modules') {
                return;
            }
            // 开发者仅在 script 中引入了 easyCom 类型，但模板里边没用到，此时额外生成一个辅助的.uvue文件
            checkUTSEasyComAutoImports(inputDir, bundle, this);
        },
        async writeBundle() {
            if (process.env.UNI_COMPILE_TARGET === 'uni_modules') {
                return;
            }
            let pageCount = 0;
            if (isFirst) {
                isFirst = false;
                // 自动化测试时，不显示页面数量进度条
                if (!process.env.UNI_AUTOMATOR_WS_ENDPOINT) {
                    pageCount = parseInt(process.env.UNI_APP_X_PAGE_COUNT) || 0;
                }
            }
            // x 上暂时编译所有uni ext api，不管代码里是否调用了
            await (0, uni_cli_shared_1.buildUniExtApis)();
            const uniCloudObjectInfo = (0, utils_1.getUniCloudObjectInfo)(uniCloudSpaceList);
            if (uniCloudObjectInfo.length > 0) {
                process.env.UNI_APP_X_UNICLOUD_OBJECT = 'true';
            }
            else {
                process.env.UNI_APP_X_UNICLOUD_OBJECT = 'false';
            }
            const { compileApp, runUTS2KotlinDev } = (0, uni_cli_shared_1.resolveUTSCompiler)();
            if (process.env.UNI_APP_X_TSC === 'true') {
                await runUTS2KotlinDev({
                    inputDir: tscOutputDir,
                    outputDir: uvueOutputDir,
                });
            }
            const res = await compileApp(path_1.default.join(uvueOutputDir, 'main.uts'), {
                pageCount,
                uniCloudObjectInfo,
                split: split !== false,
                disableSplitManifest: process.env.NODE_ENV !== 'development',
                inputDir: uvueOutputDir,
                outputDir: outputDir,
                package: 'uni.' + (manifestJson.appid || utils_1.DEFAULT_APPID).replace(/_/g, ''),
                sourceMap: process.env.NODE_ENV === 'development' &&
                    process.env.UNI_COMPILE_TARGET !== 'uni_modules',
                uni_modules: [...(0, uni_cli_shared_1.getCurrentCompiledUTSPlugins)()],
                extApis: (0, uni_cli_shared_1.parseUniExtApiNamespacesOnce)(process.env.UNI_UTS_PLATFORM, process.env.UNI_UTS_TARGET_LANGUAGE),
                extApiComponents: [...(0, utils_2.getExtApiComponents)()],
                uvueClassNamePrefix: utils_1.UVUE_CLASS_NAME_PREFIX,
                autoImports: (0, uni_cli_shared_1.getUTSEasyComAutoImports)(),
                extApiProviders: parseUniExtApiProviders(manifestJson),
                uniModulesArtifacts: (0, uni_cli_shared_1.parseUniModulesArtifacts)(),
            });
            if (res) {
                if (process.env.NODE_ENV === 'development') {
                    const files = [];
                    if (process.env.UNI_APP_UTS_CHANGED_FILES) {
                        try {
                            files.push(...JSON.parse(process.env.UNI_APP_UTS_CHANGED_FILES));
                        }
                        catch (e) { }
                    }
                    if (res.changed) {
                        // 触发了kotlinc编译，且没有编译成功
                        if (!res.changed.length && res.kotlinc) {
                            throw new Error('编译失败');
                        }
                        files.push(...res.changed);
                    }
                    process.env.UNI_APP_UTS_CHANGED_FILES = JSON.stringify([
                        ...new Set(files),
                    ]);
                }
                else {
                    // 生产环境，记录使用到的modules
                    const modules = res.inject_modules;
                    const manifest = (0, manifestJson_1.getOutputManifestJson)();
                    if (manifest) {
                        // 执行了摇树逻辑，就需要设置 modules 节点
                        (0, utils_2.updateManifestModules)(manifest, modules);
                        fs_extra_1.default.outputFileSync(path_1.default.resolve(process.env.UNI_OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
                    }
                }
            }
        },
    };
}
exports.uniAppPlugin = uniAppPlugin;
function normalizeFilename(filename, isMain = false) {
    if (isMain) {
        return 'main.uts';
    }
    return (0, utils_1.parseUTSRelativeFilename)(filename);
}
function normalizeCode(code, isMain = false) {
    if (!isMain) {
        return code;
    }
    const automatorCode = process.env.UNI_AUTOMATOR_WS_ENDPOINT &&
        process.env.UNI_AUTOMATOR_APP_WEBVIEW !== 'true'
        ? 'initAutomator();'
        : '';
    return `${code}
export function main(app: IApp) {
    definePageRoutes();
    defineAppConfig();
    ${automatorCode}
    (createApp()['app'] as VueApp).mount(app);
}
`;
}
function checkUTSEasyComAutoImports(inputDir, bundle, ctx) {
    const res = (0, uni_cli_shared_1.getUTSEasyComAutoImports)();
    Object.keys(res).forEach((fileName) => {
        if (fileName.endsWith('.vue') || fileName.endsWith('.uvue')) {
            if (fileName.startsWith('@/')) {
                fileName = fileName.slice(2);
            }
            const relativeFileName = (0, utils_1.parseUTSRelativeFilename)(fileName, inputDir);
            if (!bundle[relativeFileName]) {
                const className = (0, __1.genClassName)(relativeFileName, utils_1.UVUE_CLASS_NAME_PREFIX);
                ctx.emitFile({
                    type: 'asset',
                    fileName: (0, uni_cli_shared_1.normalizeEmitAssetFileName)(relativeFileName),
                    source: `function ${className}Render(): any | null { return null }
const ${className}Styles = []`,
                });
            }
        }
    });
    return res;
}
function parseUniExtApiProviders(manifestJson) {
    const providers = [];
    const customProviders = (0, uni_cli_shared_1.getUniExtApiProviderRegisters)();
    const userModules = manifestJson.app?.distribute?.modules || {};
    const userModuleNames = Object.keys(userModules);
    if (userModuleNames.length) {
        const systemProviders = (0, uni_cli_shared_1.resolveUTSCompiler)().parseExtApiProviders();
        userModuleNames.forEach((moduleName) => {
            const systemProvider = systemProviders[moduleName];
            if (systemProvider) {
                const userModule = userModules[moduleName];
                Object.keys(userModule).forEach((providerName) => {
                    if (systemProvider.providers.includes(providerName)) {
                        if (!customProviders.find((customProvider) => customProvider.service === systemProvider.service &&
                            customProvider.name === providerName)) {
                            providers.push([
                                systemProvider.service,
                                providerName,
                                (0, uni_cli_shared_1.formatExtApiProviderName)(systemProvider.service, providerName),
                            ]);
                        }
                    }
                });
            }
        });
    }
    customProviders.forEach((provider) => {
        providers.push([provider.service, provider.name, provider.class]);
    });
    return providers;
}
