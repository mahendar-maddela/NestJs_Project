export * from './database.module';
export * from './data-source';
export * from './enums';
// NOT re-exported here on purpose: modules/**/*.entity.ts files import shared enums via
// `from 'database/src'` (this barrel). If entities.ts (which imports every entity, including
// those files) were also re-exported here, requiring this barrel would circularly re-enter
// itself mid-initialization — CommonJS then hands back the partially-built module, so an enum
// like ActorType resolves to `undefined` at the exact moment a `@Column({ enum: ActorType })`
// decorator evaluates it, and TypeORM fails metadata validation ("missing enum or enumName
// properties") for every entity affected. database.module.ts imports ALL_ENTITIES directly from
// './entities' instead — that's not circular, so keep it that way rather than routing through here.
