import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should find a user by id', async () => {
      const userId = 'test-uuid';
      const userFromDb = {
        id: userId,
        name: 'John Doe',
        email: 'john@acme.com',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUserResponse = {
        id: userId,
        name: 'John Doe',
        email: 'john@acme.com',
        createdAt: userFromDb.createdAt,
        updatedAt: userFromDb.updatedAt,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userFromDb);

      const result = await service.findOne(userId);

      expect(result).toEqual(expectedUserResponse);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'non-existent-uuid';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsersFromDb = [
        {
          id: 'uuid1',
          name: 'User 1',
          email: 'user1@acme.com',
          password: 'hashedPassword1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'uuid2',
          name: 'User 2',
          email: 'user2@acme.com',
          password: 'hashedPassword2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const expectedUsersResponse = [
        {
          id: 'uuid1',
          name: 'User 1',
          email: 'user1@acme.com',
          createdAt: mockUsersFromDb[0].createdAt,
          updatedAt: mockUsersFromDb[0].updatedAt,
        },
        {
          id: 'uuid2',
          name: 'User 2',
          email: 'user2@acme.com',
          createdAt: mockUsersFromDb[1].createdAt,
          updatedAt: mockUsersFromDb[1].updatedAt,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsersFromDb);

      const result = await service.findAll();

      expect(result).toEqual(expectedUsersResponse);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
