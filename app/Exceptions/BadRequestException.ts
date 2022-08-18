import { Exception } from '@adonisjs/core/build/standalone'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

/*
|--------------------------------------------------------------------------
| Exception
|--------------------------------------------------------------------------
|
| The Exception class imported from `@adonisjs/core` allows defining
| a status code and error code for every exception.
|
| @example
| new BadRequestException('message', 500, 'E_RUNTIME_EXCEPTION')
|
*/
export default class BadRequestException extends Exception {
  public code = 'BAD_REQUEST'
  public statusCode = 400

  public async handle(error: this, ctx: HttpContextContract) {
    return ctx.response.status(this.statusCode).send({
      message: error.message,
      code: error.code,
    })
  }
}
