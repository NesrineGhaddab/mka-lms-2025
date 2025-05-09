import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, loginDto, RegisterDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: loginDto) {
    return this.authService.login(dto);
  }
  @Post('register')
async register(@Body() dto: RegisterDto) {
  try {
    return await this.authService.register(dto);
  } catch (error) {
    throw new HttpException(
      error.message || 'Registration failed',
      error.status || HttpStatus.BAD_REQUEST
    );
  }
}
@Get()
async findAll() {
  try {
    const users = await this.authService.findAll();
    return { 
      success: true,
      data: users 
    };
  } catch (error) {
    throw new HttpException(
      error.message || 'Failed to fetch users',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }
  @Delete('users/:id')
remove(@Param('id') id: string) {
  return this.authService.remove(Number(id));
}
}