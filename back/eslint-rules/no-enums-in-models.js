/**
 * Custom ESLint rule to prevent enum definitions in model files.
 * Enums should be defined in dedicated files under app/types/enum/
 */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow enum definitions in model files',
            category: 'Best Practices',
            recommended: true,
        },
        messages: {
            noEnumInModel: 'Enums should be defined in dedicated files under app/types/enum/ instead of in model files',
        },
        schema: [],
    },
    create(context) {
        const filename = context.getFilename();
        const isModel = filename.includes('/models/');

        if (!isModel) {
            return {};
        }

        return {
            // Detect: export enum FooEnum { ... }
            'ExportNamedDeclaration > TSEnumDeclaration'(node) {
                context.report({
                    node,
                    messageId: 'noEnumInModel',
                });
            },
            // Detect: enum FooEnum { ... }
            TSEnumDeclaration(node) {
                context.report({
                    node,
                    messageId: 'noEnumInModel',
                });
            },
        };
    },
};
