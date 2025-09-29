import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'John Doe',
      email: 'john@test.com',
      password: 'password123',
    };

    const hashedPassword = '$2b$10$hashedpassword';
    const accessToken = 'jwt.token.string';

    const mockCreatedUser = {
      id: 'user-uuid',
      name: 'John Doe',
      email: 'john@test.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const expectedUserResponse = {
      id: 'user-uuid',
      name: 'John Doe',
      email: 'john@test.com',
      createdAt: mockCreatedUser.createdAt,
      updatedAt: mockCreatedUser.updatedAt,
    };

    it('should register a new user successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);
      mockJwtService.sign.mockReturnValue(accessToken);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        access_token: accessToken,
        user: expectedUserResponse,
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...registerDto,
          password: hashedPassword,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockCreatedUser.id,
        email: mockCreatedUser.email,
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      const existingUser = {
        id: 'existing-user-uuid',
        name: 'Existing User',
        email: 'john@test.com',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('User with this email already exists')
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should handle bcrypt hashing errors', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(service.register(registerDto)).rejects.toThrow('Hashing failed');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during user creation', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockRejectedValue(new Error('Database error'));

      await expect(service.register(registerDto)).rejects.toThrow('Database error');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...registerDto,
          password: hashedPassword,
        },
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@test.com',
      password: 'password123',
    };

    const hashedPassword = '$2b$10$hashedpassword';
    const accessToken = 'jwt.token.string';

    const mockUser = {
      id: 'user-uuid',
      name: 'John Doe',
      email: 'john@test.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const expectedUserResponse = {
      id: 'user-uuid',
      name: 'John Doe',
      email: 'john@test.com',
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    };

    it('should login user successfully with correct credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(accessToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: accessToken,
        user: expectedUserResponse,
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should handle bcrypt comparison errors', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Comparison failed'));

      await expect(service.login(loginDto)).rejects.toThrow('Comparison failed');

      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should handle database errors during user lookup', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.login(loginDto)).rejects.toThrow('Database error');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    const userEmail = 'john@test.com';
    const mockUser = {
      id: 'user-uuid',
      name: 'John Doe',
      email: userEmail,
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return user when email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser(userEmail);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(userEmail);
    });

    it('should return null when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(userEmail);

      expect(result).toBeNull();
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(userEmail);
    });

    it('should handle errors from UsersService', async () => {
      mockUsersService.findByEmail.mockRejectedValue(new Error('Database error'));

      await expect(service.validateUser(userEmail)).rejects.toThrow('Database error');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(userEmail);
    });
  });

  describe('password security', () => {
    it('should use salt rounds of 10 for password hashing', async () => {
      const registerDto: RegisterDto = {
        name: 'Test User',
        email: 'test@test.com',
        password: 'testpassword',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-uuid',
        name: 'Test User',
        email: 'test@test.com',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockJwtService.sign.mockReturnValue('token');

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('testpassword', 10);
    });
  });

  describe('JWT token generation', () => {
    it('should generate token with correct payload structure', async () => {
      const loginDto: LoginDto = {
        email: 'john@test.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-uuid',
        name: 'John Doe',
        email: 'john@test.com',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt.token');

      await service.login(loginDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should generate the same token payload for both register and login', async () => {
      const user = {
        id: 'user-uuid',
        name: 'John Doe',
        email: 'john@test.com',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedPayload = {
        sub: user.id,
        email: user.email,
      };

      // Test register
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockPrismaService.user.create.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue('token');

      await service.register({
        name: user.name,
        email: user.email,
        password: 'password',
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(expectedPayload);

      // Test login
      jest.clearAllMocks();
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      await service.login({
        email: user.email,
        password: 'password',
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(expectedPayload);
    });
  });
});
