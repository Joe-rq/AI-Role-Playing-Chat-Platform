import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
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

    /**
     * 上传并压缩图片
     * @param file 上传的文件
     * @returns 文件URL
     */
    async uploadImage(file: Express.Multer.File): Promise<string> {
        const timestamp = Date.now();
        const originalExt = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, originalExt);
        const filename = `${timestamp}-${baseName}.webp`; // 统一转为WebP
        const filepath = path.join(this.uploadDir, filename);

        try {
            // 使用sharp压缩并转换为WebP格式
            await sharp(file.buffer)
                .resize(1024, 1024, {
                    fit: 'inside',            // 保持宽高比
                    withoutEnlargement: true  // 小图不放大
                })
                .webp({ quality: 80 })        // 转为WebP，质量80
                .toFile(filepath);

            const originalSizeKB = (file.buffer.length / 1024).toFixed(2);
            const compressedSizeKB = ((fs.statSync(filepath).size) / 1024).toFixed(2);
            const compressionRate = ((1 - fs.statSync(filepath).size / file.buffer.length) * 100).toFixed(1);

            this.logger.log(
                `图片压缩成功: ${file.originalname} ` +
                `(${originalSizeKB}KB → ${compressedSizeKB}KB, 压缩率${compressionRate}%)`
            );

            return this.getFileUrl(filename);
        } catch (error) {
            this.logger.error('图片压缩失败:', error);
            throw error;
        }
    }
}
