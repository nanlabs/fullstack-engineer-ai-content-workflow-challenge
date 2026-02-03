import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export const typeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('database.url'),
  autoLoadEntities: true,
  synchronize: false,
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  migrationsRun: true,
});
