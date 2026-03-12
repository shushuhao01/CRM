"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processNormalScript = void 0;
const magic_string_1 = __importDefault(require("magic-string"));
const analyzeScriptBindings_1 = require("./analyzeScriptBindings");
const rewriteConsole_1 = require("./rewriteConsole");
const rewriteDebugError_1 = require("./rewriteDebugError");
const rewriteSourceMap_1 = require("./rewriteSourceMap");
function processNormalScript(ctx, _scopeId) {
    const script = ctx.descriptor.script;
    // if (script.lang && !ctx.isJS && !ctx.isTS) {
    //   // do not process non js/ts script blocks
    //   return script
    // }
    try {
        let content = script.content;
        let map = script.map;
        const scriptAst = ctx.scriptAst;
        const bindings = (0, analyzeScriptBindings_1.analyzeScriptBindings)(scriptAst.body);
        const s = new magic_string_1.default(content);
        const relativeFilename = ctx.descriptor.relativeFilename;
        const startLine = (ctx.descriptor.script.loc.start.line || 1) - 1;
        const startOffset = 0;
        if (process.env.NODE_ENV === 'development' ||
            process.env.UNI_RUST_TEST === 'true') {
            if ((0, rewriteDebugError_1.hasDebugError)(content)) {
                (0, rewriteDebugError_1.rewriteDebugError)(scriptAst, s, {
                    fileName: relativeFilename,
                    startLine,
                    startOffset,
                });
            }
            if ((0, rewriteConsole_1.hasConsole)(content)) {
                (0, rewriteConsole_1.rewriteConsole)(scriptAst, s, {
                    fileName: relativeFilename,
                    startLine,
                    startOffset,
                });
            }
            (0, rewriteSourceMap_1.rewriteSourceMap)(scriptAst, s, {
                fileName: relativeFilename,
                startLine,
                startOffset,
            });
        }
        if (s.hasChanged()) {
            content = s.toString();
            // 需要合并旧的 sourcemap
            // if (ctx.options.sourceMap) {
            //   map = s.generateMap({
            //     source: relativeFilename,
            //     hires: true,
            //     includeContent: true,
            //   }) as unknown as RawSourceMap
            // }
        }
        return {
            ...script,
            content,
            map,
            bindings,
            scriptAst: scriptAst.body,
        };
    }
    catch (e) {
        // silently fallback if parse fails since user may be using custom
        // babel syntax
        return script;
    }
}
exports.processNormalScript = processNormalScript;
