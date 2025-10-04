/**
 * Custom ESLint rule to prevent inline validators in controller files.
 * Validators should be defined in dedicated files under app/validators/
 */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow inline validator definitions in controller files',
            category: 'Best Practices',
            recommended: true,
        },
        messages: {
            noInlineValidator: 'Validators should be defined in dedicated files under app/validators/ instead of inline in controllers',
        },
        schema: [],
    },
    create(context) {
        const filename = context.getFilename();
        const isController = filename.includes('/controllers/');

        if (!isController) {
            return {};
        }

        return {
            // Detect: vine.compile(...)
            'CallExpression[callee.object.name="vine"][callee.property.name="compile"]'(node) {
                context.report({
                    node,
                    messageId: 'noInlineValidator',
                });
            },
            // Detect: const validator = vine.compile(...)
            'VariableDeclarator[init.callee.object.name="vine"][init.callee.property.name="compile"]'(node) {
                context.report({
                    node: node.init,
                    messageId: 'noInlineValidator',
                });
            },
        };
    },
};
