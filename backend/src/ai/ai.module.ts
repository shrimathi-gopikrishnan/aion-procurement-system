import { Module, Global } from '@nestjs/common';
import { AiService } from './ai.service';
import { DecisionEngineService } from './decision-engine.service';

@Global()
@Module({
  providers: [AiService, DecisionEngineService],
  exports: [AiService, DecisionEngineService],
})
export class AiModule {}
