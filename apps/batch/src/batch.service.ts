import { Injectable, Logger } from '@nestjs/common';
import * as schedule from "node-schedule";

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(){
    this.scheduleJobs();
    this.runDailyJob(); // 서버 시작 시 즉시 작업 실행하려고 넣음
  }
  private scheduleJobs() {
    schedule.scheduleJob('* * * * *', () => {
      this.runDailyJob();
    });
  }

  private runDailyJob() {
    this.logger.debug("Batch JOB EXECUTE");
  }
}
