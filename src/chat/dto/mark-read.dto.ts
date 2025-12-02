import { IsString, IsArray } from 'class-validator';

export class MarkMessagesReadDto {
  @IsString()
  threadId: string;

  @IsArray()
  @IsString({ each: true })
  messageIds: string[];
}
