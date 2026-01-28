import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-code';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // 使用内存存储，传递buffer给sharp
      fileFilter: (req, file, callback) => {
        // 只允许图片格式
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BusinessException(
              ErrorCode.INVALID_INPUT,
              '只支持图片文件',
            ) as any,
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB（压缩前可以更大）
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BusinessException(ErrorCode.FILE_UPLOAD_ERROR, '请上传文件');
    }

    // 使用sharp处理图片
    const url = await this.uploadService.uploadImage(file);

    return {
      url,
      originalName: file.originalname,
      originalSize: file.size,
    };
  }
}
