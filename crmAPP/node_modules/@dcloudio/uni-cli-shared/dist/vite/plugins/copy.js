"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniViteCopyPlugin = void 0;
const watcher_1 = require("../../watcher");
const messages_1 = require("../../messages");
const logs_1 = require("../../logs");
const uni_shared_1 = require("@dcloudio/uni-shared");
function uniViteCopyPlugin({ targets, verbose, }) {
    let resolvedConfig;
    let initialized = false;
    return {
        name: 'uni:copy',
        apply: 'build',
        configResolved(config) {
            resolvedConfig = config;
        },
        writeBundle() {
            if (initialized) {
                return;
            }
            if (resolvedConfig.build.ssr) {
                return;
            }
            initialized = true;
            return new Promise((resolve) => {
                Promise.all(targets.map(({ watchOptions, ...target }) => {
                    return new Promise((resolve) => {
                        // 防抖，可能短时间触发很多次add,unlink
                        const onChange = (0, uni_shared_1.debounce)(() => {
                            (0, logs_1.resetOutput)('log');
                            (0, logs_1.output)('log', messages_1.M['dev.watching.end']);
                        }, 100, { setTimeout, clearTimeout });
                        new watcher_1.FileWatcher({
                            verbose,
                            ...target,
                        }).watch({
                            cwd: process.env.UNI_INPUT_DIR,
                            ...watchOptions,
                        }, (watcher) => {
                            if (process.env.NODE_ENV !== 'development' ||
                                process.env.UNI_AUTOMATOR_CONFIG) {
                                // 生产或自动化测试模式下，延迟 close，否则会影响 chokidar 初始化的 add 等事件
                                setTimeout(() => {
                                    watcher.close().then(() => resolve(void 0));
                                }, 2000);
                            }
                            else {
                                resolve(void 0);
                            }
                        }, onChange);
                    });
                })).then(() => resolve());
            });
        },
    };
}
exports.uniViteCopyPlugin = uniViteCopyPlugin;
