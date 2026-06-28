import { Controller, Get, Header, Param } from '@nestjs/common';
import {
  renderCanvasRoomPage,
  renderMobilePage,
  renderMobileQuestionPage,
  renderSocketLobbyPage,
} from '../front/socket-pages';

@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getSocketDashboard(): string {
    return renderSocketLobbyPage();
  }

  @Get('mobile')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getMobilePage(): string {
    return renderMobilePage();
  }

  @Get('mobile/question')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getMobileQuestionPage(): string {
    return renderMobileQuestionPage();
  }

  @Get('canvas/:roomId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getCanvasRoom(@Param('roomId') roomId: string): string {
    return renderCanvasRoomPage(roomId);
  }
}


