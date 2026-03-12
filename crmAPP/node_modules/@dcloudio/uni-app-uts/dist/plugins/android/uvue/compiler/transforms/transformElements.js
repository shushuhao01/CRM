"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformElements = void 0;
const compiler_core_1 = require("@vue/compiler-core");
function transformElements(node, context) {
    if (node.type === compiler_core_1.NodeTypes.ELEMENT &&
        node.tagType === compiler_core_1.ElementTypes.ELEMENT) {
        context.elements.add(node.tag);
    }
}
exports.transformElements = transformElements;
