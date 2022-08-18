import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Conflict from 'App/Exceptions/ConflictException'
import User from 'App/Models/User'
import CreateUserValidator from 'App/Validators/CreateUserValidator'
import UpdateUserValidator from 'App/Validators/UpdateUserValidator'

export default class UsersController {
  /**
   * store
   */
  public async store({ request, response }: HttpContextContract) {
    const userPayload = await request.validate(CreateUserValidator)

    const userByEmail = await User.findBy('email', userPayload.email)
    const userByUsername = await User.findBy('username', userPayload.username)

    if (userByEmail) {
      throw new Conflict('email already in use')
    }

    if (userByUsername) {
      throw new Conflict('username already in use')
    }

    const user = await User.create(userPayload)

    return response.created({ user })
  }

  /**
   * update
   */
  public async update({ request, response, bouncer }: HttpContextContract) {
    const body = await request.validate(UpdateUserValidator)
    const id = request.param('id')
    let user = await User.findOrFail(id)

    await bouncer.authorize('updateUser', user)

    await user.merge({ ...body }).save()

    return response.ok({ user })
  }
}
