import { ConfigService } from '@nestjs/config';
export declare class UploadService {
    private readonly configService;
    private uploadDir;
    constructor(configService: ConfigService);
    getUploadPath(): string;
    getFileUrl(filename: string): string;
}
