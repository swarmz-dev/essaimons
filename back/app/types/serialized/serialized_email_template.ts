export type SerializedEmailTemplate = {
    id: string;
    key: string;
    name: string;
    description: string | null;
    subjects: Record<string, string>;
    htmlContents: Record<string, string>;
    textContents: Record<string, string>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};
