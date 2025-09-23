export type MultipartFile = {
    clientName: string;
    tmpPath: string;
    extname: string;
    size: number;
    type: string;
    subtype: string;
    isValid: boolean;
    hasErrors: boolean;
    errors?: Array<{ field: string; rule: string; message: string }>;
    move: (destination: string, options?: { name?: string; overwrite?: boolean }) => Promise<void>;
    delete?: () => Promise<void>;
};
