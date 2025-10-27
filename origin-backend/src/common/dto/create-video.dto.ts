import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateVideoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
