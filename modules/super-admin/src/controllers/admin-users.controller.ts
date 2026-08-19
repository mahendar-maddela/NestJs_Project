import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { UserService } from '../../../users/src/services/user.service';

@Controller('v1/admin/users')
export class AdminUsersController {
  constructor(private readonly userService: UserService) { }

  @Get()
  async findAll(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.userService.getAllUsers(skip ? +skip : 0, take ? +take : 10);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }
}
