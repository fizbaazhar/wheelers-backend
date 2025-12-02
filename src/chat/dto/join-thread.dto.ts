import { IsString } from 'class-validator';

export class JoinThreadDto {
  @IsString()
  threadId: string;
}
