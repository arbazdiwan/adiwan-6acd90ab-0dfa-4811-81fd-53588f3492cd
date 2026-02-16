import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '@task-management/data';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['organization'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    organizationId: string;
  }): Promise<User> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const user = this.userRepo.create({
      ...data,
      password: hashedPassword,
    });

    return this.userRepo.save(user);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    return this.userRepo.find({ where: { organizationId } });
  }
}
