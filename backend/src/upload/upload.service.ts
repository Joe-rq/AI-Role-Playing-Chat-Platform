import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadService {
    private uploadDir: string;

    constructor(private readonly configService: ConfigService) {
        this.uploadDir = path.join(process.cwd(), 'uploads');
        // 确保上传目录存在
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    getUploadPath(): string {
        return this.uploadDir;
    }

    getFileUrl(filename: string): string {
        const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
        return `${baseUrl}/uploads/${filename}`;
    }
}
