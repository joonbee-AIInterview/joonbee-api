import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { CustomError } from "./common";


@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost){
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        if(exception instanceof CustomError){
            return response.status(exception.statusCode).json({
                statusCode: exception.statusCode,
                message: exception.message,
            });
        }else if(exception instanceof HttpException){
            console.error(exception);
            return response.status(exception.getStatus()).json({
                statusCode: exception.getStatus(),
                message: exception.getResponse(),
            });
        }else{
            console.error(exception);
            return response.status(500).json({
                statusCode: 500,
                message: 'SERVER ERROR',
            });
        }
    }
}