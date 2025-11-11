import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const req = ctx.getRequest<Request>();
        const res = ctx.getResponse<Response>();

        let status = 500;
        let message = "Something went wrong";

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const response = exception.getResponse();

            message =
                typeof response === "string"
                    ? response
                    : (response as any).message || exception.message;
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        return res.status(status).json({
            success: false,
            statusCode: status,
            message,
            path: req.url,
            timestamp: new Date().toISOString(),
        });
    }
}
