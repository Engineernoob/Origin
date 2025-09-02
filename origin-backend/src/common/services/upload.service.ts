import { Injectable } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class UploadService {
  static getVideoStorage() {
    return diskStorage({
      destination: './uploads/videos',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    });
  }

  static getThumbnailStorage() {
    return diskStorage({
      destination: './uploads/thumbnails',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    });
  }

  static videoFileFilter = (req: any, file: any, callback: any) => {
    if (!file.mimetype.match(/\/(mp4|avi|mkv|mov|wmv|flv|webm)$/)) {
      return callback(new Error('Only video files are allowed!'), false);
    }
    callback(null, true);
  };

  static imageFileFilter = (req: any, file: any, callback: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
  };
}