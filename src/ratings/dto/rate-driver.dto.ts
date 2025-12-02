import { IsString, IsNumber, IsOptional, Min, Max, IsNotEmpty } from 'class-validator';

export class RateDriverDto {
  @IsString()
  @IsNotEmpty()
  rideId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

