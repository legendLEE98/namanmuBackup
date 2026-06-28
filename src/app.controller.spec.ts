import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { AppController } from './socket/socket.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('socket lobby', () => {
    it('should return the socket room lobby html', () => {
      expect(appController.getSocketDashboard()).toContain('Orbit 소켓 방');
    });
  });

  describe('mobile page', () => {
    it('should return the mobile html', () => {
      expect(appController.getMobilePage()).toContain('Orbit 모바일');
    });
  });

  describe('mobile question page', () => {
    it('should return the mobile question html', () => {
      expect(appController.getMobileQuestionPage()).toContain('질문하기');
    });
  });

  describe('canvas room', () => {
    it('should return the canvas room html', () => {
      expect(appController.getCanvasRoom('room_1')).toContain('Orbit 캔버스');
    });
  });
});


