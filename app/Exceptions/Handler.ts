/*
|--------------------------------------------------------------------------
| Http Exception Handler
|--------------------------------------------------------------------------
|
| AdonisJs will forward all exceptions occurred during an HTTP request to
| the following class. You can learn more about exception handling by
| reading docs.
|
| The exception handler extends a base `HttpExceptionHandler` which is not
| mandatory, however it can do lot of heavy lifting to handle the errors
| properly.
|
*/

import Logger from '@ioc:Adonis/Core/Logger'
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler'
import { Exception } from '@adonisjs/core/build/standalone'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { ValidationException } from '@ioc:Adonis/Core/Validator'

export default class ExceptionHandler extends HttpExceptionHandler {
  constructor() {
    super(Logger)
  }

  public async handle(error: Exception, ctx: HttpContextContract) {
    if (error instanceof ValidationException) {
      return ctx.response.status(400).send({
        code: 'BAD_REQUEST',
        message: error.message,
        status: 400,
        errors: error['messages'].errors,
        sadd: error.name,
      })
    }

    if (error.code === 'E_ROW_NOT_FOUND') {
      return ctx.response.status(404).send({
        code: 'NOT_FOUND',
        message: error.message,
        status: 404,
      })
    }

    if (error.code === 'E_INVALID_AUTH_UID') {
      return ctx.response.status(400).send({
        code: 'BAD_REQUEST',
        message: 'INVALID CREDENTIALS ',
        status: 400,
      })
    }

    if (error.code === 'E_INVALID_AUTH_PASSWORD') {
      return ctx.response.status(400).send({
        code: 'BAD_REQUEST',
        message: 'INVALID CREDENTIALS ',
        status: 400,
      })
    }

    return super.handle(error, ctx)
  }
}
