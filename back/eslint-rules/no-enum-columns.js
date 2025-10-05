/**
 * Custom ESLint rule to prevent PostgreSQL ENUM column types in migrations.
 * PostgreSQL handles ALTER operations on ENUM columns very poorly.
 * Use VARCHAR/STRING columns instead with TypeScript type validation.
 */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow table.enum() in migration files due to PostgreSQL ALTER limitations',
            category: 'Best Practices',
            recommended: true,
        },
        messages: {
            noEnumColumn: 'Avoid table.enum() - PostgreSQL handles ALTER operations on ENUM columns poorly. Use table.string() instead with TypeScript type validation in the model.',
        },
        schema: [],
    },
    create(context) {
        const filename = context.getFilename();
        const isMigration = filename.includes('/migrations/');

        if (!isMigration) {
            return {};
        }

        return {
            // Detect: table.enum(...)
            'CallExpression[callee.property.name="enum"][callee.object.name="table"]'(node) {
                context.report({
                    node,
                    messageId: 'noEnumColumn',
                });
            },
        };
    },
};
