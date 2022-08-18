import { test } from '@japa/runner'
import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'

test.group('Session', (group) => {
  group.tap((test) => test.tags(['@session']))

  group.each.setup(async () => {
    await Database.beginGlobalTransaction('sqlite3')
    return () => Database.rollbackGlobalTransaction('sqlite3')
  })

  test('It should authenticate an user', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { id, email } = await UserFactory.merge({ password: plainPassword }).create()

    const response = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const { user } = response.body()

    response.assertStatus(201)
    assert.isDefined(user, 'User undefined')
    assert.equal(user.id, id)
  })

  test('It should return an api token when session is created', async ({ assert, client }) => {
    const plainPassword = 'test'
    const { id, email } = await UserFactory.merge({ password: plainPassword }).create()

    const response = await client.post('/sessions').json({
      email,
      password: plainPassword,
    })
    const { token, user } = response.body()

    response.assertStatus(201)
    assert.isDefined(token, 'Token undefined')
    assert.equal(user.id, id)
  })

  test('It should return 400 when credentials are not provided', async ({ assert, client }) => {
    const response = await client.post('/sessions').json({})
    const body = response.body()

    response.assertStatus(400)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })

  test('It should return 400 when credentials are invalid', async ({ assert, client }) => {
    const { email } = await UserFactory.create()
    const response = await client.post('/sessions').json({
      email,
      password: 'dfsdlfndsnfdn232',
    })
    const body = response.body()

    response.assertStatus(400)
    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })

  test('It should return 200 when user signs out', async ({ assert, client }) => {
    const { email } = await UserFactory.merge({ password: 'dfsdlfndsnfdn232' }).create()
    const response = await client.post('/sessions').json({
      email,
      password: 'dfsdlfndsnfdn232',
    })

    response.assertStatus(201)
    const body = response.body()

    const apiToken = body.token

    const respDelete = await client.delete('/sessions').bearerToken(apiToken)

    respDelete.assertStatus(200)
  })

  test('It should revoke token when user signs out', async ({ assert, client }) => {
    const { email } = await UserFactory.merge({ password: 'dfsdlfndsnfdn232' }).create()
    const response = await client.post('/sessions').json({
      email,
      password: 'dfsdlfndsnfdn232',
    })

    response.assertStatus(201)

    const body = response.body()
    const apiToken = body.token

    const respDelete = await client.delete('/sessions').bearerToken(apiToken)

    respDelete.assertStatus(200)

    const token = await Database.query()
      .select('*')
      .from('api_tokens')
      .where('token', apiToken.token)

    assert.isEmpty(token)
  })
})
