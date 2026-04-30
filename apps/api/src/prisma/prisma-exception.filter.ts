import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Response } from 'express';

const errorMap: Record<
  string,
  { status: number; message: string } | undefined
> = {
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'Invalid data provided' },
  P2002: { status: HttpStatus.CONFLICT, message: 'Resource already exists' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Resource not found' },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'A constraint failed on the database',
  },
};

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.error('Prisma error:', exception);

    const prismaCode = exception.code;

    const { status, message } = errorMap[prismaCode] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Internal prisma server error ${prismaCode}`,
    };

    response.status(status).json({ statusCode: status, message });
  }
}
