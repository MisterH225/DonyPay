import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddDisputeMessageDto {
  @IsUUID()
  authorId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}
