// InvoiceGeneration DTOs
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class PostApiInvoicesRequestDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;
}

export interface PostApiInvoicesResponseDto {
  id: string;
  orderId: string;
  amount: number;
}

export interface GetApiInvoicesIdDownloadResponseDto {
  id: string;
  downloadUrl: string;
}
