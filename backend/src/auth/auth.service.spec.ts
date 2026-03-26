import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('jwt-token-123'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const dto = { email: 'test@example.com', password: 'password123', name: 'Test User' };

    it('creates user with hashed password and returns token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        password: 'hashed',
      });

      const result = await service.signup(dto);

      expect(result.access_token).toBe('jwt-token-123');
      expect(result.user).toEqual({ id: 'user-1', email: dto.email, name: dto.name });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: dto.email,
          name: dto.name,
        }),
      });
      // Verify password was hashed (not stored as plain text)
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe(dto.password);
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: dto.email });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('hashes password with bcrypt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        password: 'hashed',
      });

      await service.signup(dto);

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      const isValidHash = await bcrypt.compare(dto.password, createCall.data.password);
      expect(isValidHash).toBe(true);
    });

    it('generates JWT with correct payload', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        password: 'hashed',
      });

      await service.signup(dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: dto.email,
      });
    });
  });

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('returns token for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: 'Test',
        password: hashedPassword,
      });

      const result = await service.login(dto);

      expect(result.access_token).toBe('jwt-token-123');
      expect(result.user).toEqual({ id: 'user-1', email: dto.email, name: 'Test' });
    });

    it('throws UnauthorizedException for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('different-password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: 'Test',
        password: hashedPassword,
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('generates JWT with correct payload on login', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: 'Test',
        password: hashedPassword,
      });

      await service.login(dto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: dto.email,
      });
    });
  });

  describe('validateUser', () => {
    it('returns user when found', async () => {
      const user = { id: 'user-1', email: 'test@example.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser('user-1');

      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, email: true, name: true },
      });
    });

    it('returns null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('non-existent');

      expect(result).toBeNull();
    });
  });
});
