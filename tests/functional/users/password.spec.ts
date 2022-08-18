import Hash from '@ioc:Adonis/Core/Hash'
import Mail, { MessageSearchNode } from '@ioc:Adonis/Addons/Mail'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import { UserFactory } from 'Database/factories'
import { DateTime, Duration } from 'luxon'

test.group('Password integration tests', (group) => {
  group.tap((test) => test.tags(['@password']))

  group.each.setup(async () => {
    await Database.beginGlobalTransaction('sqlite3')
    return () => Database.rollbackGlobalTransaction('sqlite3')
  })

  test('It should send an email with forgot password instructions', async ({ assert, client }) => {
    const user = await UserFactory.create()
    const fakeMailer = Mail.fake()

    const response = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url',
    })

    const { to, from, subject, html } = fakeMailer.find({
      to: [{ address: user.email }],
    }) as MessageSearchNode

    assert.equal(subject, 'Roleplay: Recuperação de Senha')
    assert.deepEqual(to, [
      {
        address: user.email,
        name: '',
      },
    ])
    assert.deepEqual(from, {
      address: 'no-reply@roleplay.com',
      name: '',
    })
    assert.include(html, user.username)

    Mail.restore()

    response.assertStatus(204)
  })

  test('It should create a reset password token', async ({ assert, client }) => {
    const user = await UserFactory.create()

    const response = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url',
    })

    response.assertStatus(204)

    const tokens = await user.related('tokens').query()

    assert.isNotEmpty(tokens)
  })

  test('It should return 400 when required data is not provided or data is invalid', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/forgot-password').json({})

    response.assertStatus(400)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('should be able to reset password', async ({ assert, client }) => {
    const user = await UserFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })

    const response = await client.post('/reset-password').json({
      token,
      password: '123456',
    })

    await user.refresh()

    response.assertStatus(204)
    assert.isTrue(await Hash.verify(user.password, '123456'))
  })

  test('It should return 400 when required data is not provided or data is invalid', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/reset-password').json({})

    response.assertStatus(400)

    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 404 when using the same token twice', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })

    const response = await client.post('/reset-password').json({
      token,
      password: '123456',
    })

    response.assertStatus(204)

    const failResponse = await client.post('/reset-password').json({
      token,
      password: '123456',
    })

    const body = failResponse.body()

    assert.equal(failResponse.status(), 404)
    assert.equal(body.code, 'NOT_FOUND')
  })

  test('It cannot reset password when token is expired', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const date = DateTime.now().minus(Duration.fromISOTime('02:01'))
    const { token } = await user.related('tokens').create({ token: 'token', createdAt: date })

    const response = await client.post('/reset-password').json({
      token,
      password: '123456',
    })

    assert.equal(response.status(), 410)
    assert.equal(response.body().code, 'TOKEN_EXPIRED')
    assert.equal(response.body().message, 'token has expired')
  })
})
