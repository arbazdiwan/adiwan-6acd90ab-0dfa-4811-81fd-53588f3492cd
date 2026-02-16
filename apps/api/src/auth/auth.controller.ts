import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { Request } from 'express';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginBodyDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginBodyDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    return this.authService.login(body.email, body.password, ipAddress || undefined);
  }
}
