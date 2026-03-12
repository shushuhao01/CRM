"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOptions = void 0;
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
function resolveBase() {
    const manifest = (0, uni_cli_shared_1.parseManifestJsonOnce)(process.env.UNI_INPUT_DIR);
    return (manifest.h5 && manifest.h5.router && manifest.h5.router.base) || '/';
}
function initOptions(options, config) {
    options.base = resolveBase();
    options.outputDir = process.env.UNI_OUTPUT_DIR;
    options.assetsDir = config.build.assetsDir;
}
exports.initOptions = initOptions;
