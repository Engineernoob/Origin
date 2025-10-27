import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateVideoDto {
  @IsString() title!: string;
  @IsString() creatorName!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl() creatorAvatar?: string;
  @IsOptional() @IsString() creatorSubscribers?: string;
  @IsUrl() videoUrl!: string;
  @IsOptional() @IsUrl() thumbnailUrl?: string;
  @IsOptional() @IsBoolean() isRebelContent?: boolean;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() externalId?: string;
}
