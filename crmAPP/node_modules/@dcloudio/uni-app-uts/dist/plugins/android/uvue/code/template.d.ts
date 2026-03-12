import type { SFCDescriptor } from '@vue/compiler-sfc';
import type { TemplateCompilerOptions } from '../compiler/options';
import type { TransformPluginContext } from 'rollup';
export declare function genTemplate({ template }: SFCDescriptor, options: TemplateCompilerOptions): import("../compiler/options").CodegenResult;
export declare const genTemplateCode: typeof genTemplate;
export declare function tryResolveTemplateSrc(descriptor: SFCDescriptor, pluginContext?: TransformPluginContext): Promise<void>;
