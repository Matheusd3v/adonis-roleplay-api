import { test } from '@japa/runner'
import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'
import Hash from '@ioc:Adonis/Core/Hash'
import axios from 'axios'
import User from 'App/Models/User'

let token = ''
let user = {} as User

test.group('User', (group) => {
  group.tap((test) => test.tags(['@users']))

  group.each.setup(async () => {
    await Database.beginGlobalTransaction('sqlite3')
    return () => Database.rollbackGlobalTransaction('sqlite3')
  })

  group.setup(async () => {
    const newUser = await UserFactory.merge({ password: 'dfsdlfndsnfdn232' }).create()
    const { data } = await axios.post('http://localhost:3333/sessions', {
      email: newUser.email,
      password: 'dfsdlfndsnfdn232',
    })

    token = data.token.token

    user = newUser
  })

  test('it should create an user', async ({ assert, client }) => {
    const userPayload = {
      email: 'email@mail.com',
      username: 'user',
      password: '1234',
    }

    const response = await client.post('/users').json(userPayload)
    const { user } = response.body()

    response.assertStatus(201)
    assert.exists(user, 'User undefined')
    assert.exists(user.id, 'Id undefined')
    assert.equal(user.email, userPayload.email)
    assert.equal(user.username, userPayload.username)
    assert.notExists(user.password, 'Password defined')
  })

  test('it should return 409 when email is already in use', async ({ assert, client }) => {
    const { email } = await UserFactory.create()

    const response = await client.post('/users').json({
      email,
      username: 'user',
      password: '1234',
    })

    response.assertStatus(409)

    const body = response.body()

    assert.exists(body.message)
    assert.include(body.message, 'email')
    assert.equal(body.code, 'CONFLICT')
  })

  test('it should return 409 when username is already in use', async ({ assert, client }) => {
    const { username } = await UserFactory.create()

    const response = await client.post('/users').json({
      username,
      email: 'user@mail.com',
      password: '1234',
    })

    response.assertStatus(409)

    const body = response.body()

    assert.exists(body.message)
    assert.include(body.message, 'username')
    assert.equal(body.code, 'CONFLICT')
  })

  test('it should return 400 when required data is not provided', async ({ assert, client }) => {
    const response = await client.post('/users').json({})
    const body = response.body()

    response.assertStatus(400)
    assert.equal(body.code, 'BAD_REQUEST')
  })

  test('it should return 400 when providing an invalid email', async ({ assert, client }) => {
    const response = await client.post('/users').json({
      email: 'test@',
      username: 'wsdas',
      password: 'dssadasds,',
    })
    const body = response.body()

    response.assertStatus(400)
    assert.equal(body.code, 'BAD_REQUEST')
  })

  test('It should upadte an user', async ({ assert, client }) => {
    const email = 'test@mail.com'
    const avatar = 'http://randomUrl.com'

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email,
        avatar,
        password: user.password,
      })
      .bearerToken(token)

    const body = response.body()
    response.assertStatus(200)

    assert.exists(body.user, 'User undefined')
    assert.equal(body.user.email, email)
    assert.equal(body.user.avatar, avatar)
    assert.equal(body.user.id, user.id)
  })

  test('It should updated the password of the user', async ({ assert, client }) => {
    const password = 'test1234'

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email: 'test1@mail.com',
        password,
      })
      .bearerToken(token)

    const body = response.body()

    response.assertStatus(200)

    assert.exists(body.user, 'User undefined')
    assert.equal(body.user.id, user.id)

    await user.refresh()

    assert.isTrue(await Hash.verify(user.password, password))
  })

  test('It should return 400 when required data is not provided', async ({ assert, client }) => {
    const { id } = await UserFactory.create()

    const response = await client.put(`/users/${id}`).json({}).bearerToken(token)
    const body = response.body()

    response.assertStatus(400)

    assert.equal(body.code, 'BAD_REQUEST')
  })

  test('It should return 400 when providing an invalid email', async ({ assert, client }) => {
    const { id, password } = await UserFactory.create()
    const invalidEmail = 'sdsasasad'

    const response = await client
      .put(`/users/${id}`)
      .json({
        email: invalidEmail,
        password,
      })
      .bearerToken(token)
    const body = response.body()

    response.assertStatus(400)
    assert.equal(body.code, 'BAD_REQUEST')
  })

  test('It should return 400 when providing an invalid avatar', async ({ assert, client }) => {
    const { id, password, email } = await UserFactory.create()

    const response = await client
      .put(`/users/${id}`)
      .json({
        email,
        password,
        avatar: 3595645,
      })
      .bearerToken(token)
    const body = response.body()

    response.assertStatus(400)
    assert.equal(body.code, 'BAD_REQUEST')
  })
})
