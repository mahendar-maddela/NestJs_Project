import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) { }

  async getUserById(id: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async getAllUsers(skip = 0, take = 10) {
    return this.userRepository.findAll({ skip, take });
  }

  async createUser(data: any) {
    return this.userRepository.create(data);
  }

  async updateUser(id: number, data: any) {
    return this.userRepository.update(id, data);
  }

  async deleteUser(id: number) {
    return this.userRepository.delete(id);
  }
}
