import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminDisputeMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}
