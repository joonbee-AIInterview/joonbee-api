import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";



@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);
    
    catch(exception: any, host: ArgumentsHost) {
        this.logger.error("Error in batch program ");

        //TODO: 에러 발생시 조치필요
        // pm2 start dist/main.js --naem batch --restart-delay=5000
    }
}