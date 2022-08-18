import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import User from 'App/Models/User'
import { UserFactory } from 'Database/factories'
import axios from 'axios'

let token = ''
let user = {} as User

test.group('Group', (group) => {
  group.tap((test) => test.tags(['@group']))

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

  group.teardown(async () => {
    await axios.delete('http://localhost:3333/sessions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  })

  test('It should create a group', async ({ assert, client }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const response = await client.post('/groups').json(groupPayload).bearerToken(token)
    const body = response.body()

    response.assertStatus(201)

    assert.exists(body.group, 'Group Undefined')
    assert.equal(body.group.name, groupPayload.name)
    assert.equal(body.group.description, groupPayload.description)
    assert.equal(body.group.schedule, groupPayload.schedule)
    assert.equal(body.group.location, groupPayload.location)
    assert.equal(body.group.chronic, groupPayload.chronic)
    assert.equal(body.group.master, groupPayload.master)

    assert.exists(body.group.players, 'Players undefined')
    assert.equal(body.group.players.length, 1)
    assert.equal(body.group.players[0].id, groupPayload.master)
  })

  test('It should return 400 when required data is not provided', async ({ assert, client }) => {
    const response = await client.post('/groups').json({}).bearerToken(token)
    const body = response.body()

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })
})
