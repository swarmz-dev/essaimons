import vine from '@vinejs/vine';

/**
 * Validator pour l'upload d'un fichier d'export
 */
export const importUploadValidator = vine.compile(
    vine.object({
        file: vine.file({
            size: '50mb',
            extnames: ['json'],
        }),
    })
);

/**
 * Validator pour la configuration de résolutions
 */
export const importConfigurationValidator = vine.compile(
    vine.object({
        importId: vine.string().trim(),
        resolutions: vine.array(
            vine.object({
                conflictIndex: vine.number(),
                strategy: vine.enum(['CREATE_NEW', 'MAP_EXISTING', 'MERGE', 'SKIP', 'REMOVE']),
                mappedId: vine.string().trim().optional(),
                createData: vine
                    .object({
                        username: vine.string().trim().optional(),
                        email: vine.string().trim().email().optional(),
                        password: vine.string().trim().minLength(8).optional(),
                    })
                    .optional(),
                fieldResolutions: vine
                    .array(
                        vine.object({
                            field: vine.string().trim(),
                            action: vine.enum(['KEEP_INCOMING', 'KEEP_CURRENT', 'MERGE_BOTH', 'SKIP']),
                        })
                    )
                    .optional(),
            })
        ),
    })
);

/**
 * Validator pour l'export de propositions
 */
export const exportPropositionsValidator = vine.compile(
    vine.object({
        propositionIds: vine.array(vine.string().trim().uuid()).minLength(1),
        options: vine
            .object({
                includeStatusHistory: vine.boolean().optional(),
                includeVotes: vine.boolean().optional(),
                includeBallots: vine.boolean().optional(),
                includeMandates: vine.boolean().optional(),
                includeComments: vine.boolean().optional(),
                includeEvents: vine.boolean().optional(),
                includeReactions: vine.boolean().optional(),
            })
            .optional(),
    })
);
