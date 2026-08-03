import { Module } from '@nestjs/common';
import { DisputesModule } from '../disputes/disputes.module';
import { IdentityModule } from '../identity/identity.module';
import { LedgerAdapterModule } from '../ledger-adapter/ledger-adapter.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';

/**
 * Console ops — KYC manuel, ledger lecture seule, litiges.
 * Toutes les routes sont protégées par AdminApiKeyGuard (ADMIN_API_KEY).
 */
@Module({
  imports: [IdentityModule, LedgerAdapterModule, DisputesModule],
  controllers: [AdminController],
  providers: [AdminService, AdminApiKeyGuard],
})
export class AdminModule {}
