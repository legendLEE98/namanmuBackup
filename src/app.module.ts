import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './socket/socket.controller';
import { AppGateway } from './socket/socket.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AppGateway],
})
export class AppModule {}
