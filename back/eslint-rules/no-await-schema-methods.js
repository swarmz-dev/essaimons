/**
 * Custom ESLint rule to prevent awaiting schema builder methods in migrations.
 * Methods like createTable, alterTable, dropTable don't return Promises.
 * Only hasTable, hasColumn, and raw() should be awaited.
 */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: "Disallow await on schema builder methods that don't return Promises",
            category: 'Best Practices',
            recommended: true,
        },
        messages: {
            noAwaitSchemaMethod: 'Do not await this.schema.{{ method }}() - it does not return a Promise. Only hasTable(), hasColumn(), and raw() should be awaited.',
        },
        schema: [],
    },
    create(context) {
        const filename = context.getFilename();
        const isMigration = filename.includes('/migrations/');

        if (!isMigration) {
            return {};
        }

        const NON_ASYNC_METHODS = ['createTable', 'createTableIfNotExists', 'alterTable', 'dropTable', 'dropTableIfExists', 'renameTable'];

        return {
            // Detect: await this.schema.createTable(...)
            'AwaitExpression > CallExpression[callee.object.object.type="ThisExpression"][callee.object.property.name="schema"]'(node) {
                const methodName = node.callee.property.name;

                if (NON_ASYNC_METHODS.includes(methodName)) {
                    context.report({
                        node: node.parent,
                        messageId: 'noAwaitSchemaMethod',
                        data: {
                            method: methodName,
                        },
                    });
                }
            },
        };
    },
};
