/**
 * Custom ESLint rule to prevent returning unawaited Lucid ORM query builders.
 * Query builders must be awaited before being returned to ensure database connections are released.
 */
export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow returning unawaited Lucid query builders that can cause database connection leaks',
            category: 'Possible Errors',
            recommended: true,
        },
        messages: {
            noUnawaitedQuery: 'Query builder must be awaited before returning. Unawaited queries can cause database connection leaks. Add "await" before the query: "return await {{expression}}"',
        },
        schema: [],
    },
    create(context) {
        /**
         * Check if an expression is a Lucid query builder call chain
         */
        function isQueryBuilder(node) {
            if (!node) return false;

            // Check for .query() calls
            if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'query') {
                return true;
            }

            // Check for chained query methods like .where(), .preload(), .orderBy(), .paginate(), etc.
            if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
                const queryMethods = [
                    'where',
                    'whereIn',
                    'whereNotIn',
                    'whereNull',
                    'whereNotNull',
                    'whereBetween',
                    'whereNot',
                    'andWhere',
                    'orWhere',
                    'preload',
                    'orderBy',
                    'paginate',
                    'select',
                    'limit',
                    'offset',
                    'groupBy',
                    'having',
                    'join',
                    'leftJoin',
                    'innerJoin',
                    'distinct',
                ];

                if (queryMethods.includes(node.callee.property.name)) {
                    // Recursively check if the object is also a query builder
                    return isQueryBuilder(node.callee.object);
                }
            }

            return false;
        }

        /**
         * Get the source code text for an expression
         */
        function getExpressionText(node) {
            const sourceCode = context.getSourceCode();
            const text = sourceCode.getText(node);
            // Limit to first 50 characters for readability
            return text.length > 50 ? text.substring(0, 50) + '...' : text;
        }

        /**
         * Check if a return statement is returning an unawaited query builder
         */
        function checkReturnStatement(node) {
            if (!node.argument) return;

            // Skip if already awaited
            if (node.argument.type === 'AwaitExpression') return;

            // Check if returning a query builder
            if (isQueryBuilder(node.argument)) {
                context.report({
                    node: node.argument,
                    messageId: 'noUnawaitedQuery',
                    data: {
                        expression: getExpressionText(node.argument),
                    },
                });
            }
        }

        return {
            // Check return statements in async functions
            'FunctionDeclaration[async=true] ReturnStatement': checkReturnStatement,
            'FunctionExpression[async=true] ReturnStatement': checkReturnStatement,
            'ArrowFunctionExpression[async=true] ReturnStatement': checkReturnStatement,
            'MethodDefinition[value.async=true] ReturnStatement': checkReturnStatement,
        };
    },
};
