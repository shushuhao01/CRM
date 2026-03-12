import type { SFCDescriptor } from '@vue/compiler-sfc';
import type { SourceMapInput, TransformPluginContext } from 'rollup';
import type { ResolvedOptions } from './index';
export declare function transformMain(code: string, filename: string, options: ResolvedOptions, pluginContext?: TransformPluginContext, // 该 transformMain 方法被vuejs-core使用，编译框架内置组件了，此时不会传入pluginContext
isAppVue?: boolean): Promise<{
    code: string;
    map: SourceMapInput;
    errors: (SyntaxError | import("@vue/compiler-core").CompilerError)[];
    uts: string;
    descriptor: SFCDescriptor;
} | null>;
