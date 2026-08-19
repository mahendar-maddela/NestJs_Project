import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from './entities';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        url: configService.get<string>('DATABASE_URL'),
        // Explicit imports, not a glob: some apps (apps/scheduler, apps/ocpp-gateway) only
        // import a handful of modules directly, but TypeORM still needs metadata for every
        // entity reachable via relations from those — autoLoadEntities alone only picks up
        // forFeature()-registered entities in the imported graph, so a relation to an entity
        // nobody forFeature'd fails at boot. A __dirname-relative glob doesn't work here either:
        // each app's `nest build <app>` compiles its own self-contained dist/apps/<app>/ tree
        // containing only the files that app's import graph actually reaches, so the same glob
        // resolves to a different, incomplete set of .entity.js files per app at runtime (apps/api
        // happens to import nearly everything, so it looked complete by accident; apps/scheduler
        // and apps/ocpp-gateway don't). Real ES imports in ./entities.ts are always followed by
        // tsc regardless of which app compiles it, so every app's dist/ ends up with the full set.
        entities: ALL_ENTITIES,
        autoLoadEntities: true,
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
