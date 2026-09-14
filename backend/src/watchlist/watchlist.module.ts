import { Module } from '@nestjs/common';
import {
  InMemoryWatchlistRepository,
  WatchlistRepository,
} from './repositories/watchlist.repository';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

/**
 * Módulo de watchlist.
 * Enlaza el contrato `WatchlistRepository` con su implementación en memoria.
 */
@Module({
  controllers: [WatchlistController],
  providers: [
    WatchlistService,
    { provide: WatchlistRepository, useClass: InMemoryWatchlistRepository },
  ],
  exports: [WatchlistService],
})
export class WatchlistModule {}
