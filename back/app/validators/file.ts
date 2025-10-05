import vine from '@vinejs/vine';

export const serveStaticProfilePictureFileValidator = vine.compile(
    vine.object({
        userId: vine.string().uuid(),
    })
);

export const serveStaticPropositionVisualFileValidator = vine.compile(
    vine.object({
        propositionId: vine.string().trim().minLength(1),
    })
);

export const serveStaticPropositionAttachmentFileValidator = vine.compile(
    vine.object({
        attachmentId: vine.string().uuid(),
    })
);

export const serveStaticMandateDeliverableFileValidator = vine.compile(
    vine.object({
        deliverableId: vine.string().uuid(),
    })
);
