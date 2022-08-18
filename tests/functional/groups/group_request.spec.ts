import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import User from 'App/Models/User'
import { GroupFactory, UserFactory } from 'Database/factories'
import axios from 'axios'

let token = ''
let user = {} as User

test.group('Group Request', (group) => {
  group.tap((test) => test.tags(['@group_req']))

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

  test('It should create a group request', async ({ assert, client }) => {
    const { id } = await UserFactory.create()
    const group = await GroupFactory.merge({ master: id }).create()
    const response = await client.post(`/groups/${group.id}/requests`).json({}).bearerToken(token)

    const body = response.body()

    assert.equal(response.status(), 201)
    assert.exists(body.groupRequest, 'GroupRequest Undefined')
    assert.equal(body.groupRequest.userId, user.id)
    assert.equal(body.groupRequest.groupId, group.id)
    assert.equal(body.groupRequest.status, 'PENDING')
  })

  test('It should return 409 when group request already exists', async ({ assert, client }) => {
    const { id } = await UserFactory.create()
    const group = await GroupFactory.merge({ master: id }).create()
    await client.post(`/groups/${group.id}/requests`).json({}).bearerToken(token)

    const response = await client.post(`/groups/${group.id}/requests`).json({}).bearerToken(token)

    const body = response.body()

    assert.equal(response.status(), 409)
    assert.equal(body.code, 'CONFLICT')
  })

  test('It should return 400 when user is already in the group', async ({ assert, client }) => {
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const groupResp = await client.post('/groups').bearerToken(token).json(groupPayload)
    const { group } = groupResp.body()

    const response = await client.post(`/groups/${group.id}/requests`).json({}).bearerToken(token)

    const body = response.body()

    assert.equal(response.status(), 400)
    assert.equal(body.code, 'BAD_REQUEST')
  })

  test('It should list group requests by master', async ({ assert, client }) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const groupResp = await client.post(`/groups/${group.id}/requests`).json({}).bearerToken(token)
    const groupRequest = groupResp.body().groupRequest

    const response = await client.get(`/groups/${group.id}/requests?master=${master.id}`)
    const body = response.body()

    assert.equal(response.status(), 200)
    assert.exists(body.groupRequest, 'GroupRequest undefined')
    assert.equal(body.groupRequest.length, 1)
    assert.equal(body.groupRequest[0].id, groupRequest.id)
    assert.equal(body.groupRequest[0].userId, groupRequest.userId)
    assert.equal(body.groupRequest[0].groupId, groupRequest.groupId)
    assert.equal(body.groupRequest[0].status, groupRequest.status)
    assert.equal(body.groupRequest[0].group.name, group.name)
    assert.equal(body.groupRequest[0].user.username, user.username)
    assert.equal(body.groupRequest[0].group.master, master.id)
  })

  test('It should return an empty list when master has no group requests', async ({
    assert,
    client,
  }) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const response = await client.get(`/groups/${group.id}/requests?master=${user.id}`)
    const body = response.body()

    assert.exists(body.groupRequest, 'GroupRequests undefined')
    assert.equal(body.groupRequest.length, 0)
  })

  test('It should return 400 when master is not provied', async ({ assert, client }) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const response = await client.get(`/groups/${group.id}/requests`)
    const body = response.body()

    assert.equal(response.status(), 400)
    assert.equal(body.code, 'BAD_REQUEST')
  })

  test('It should accept a group request', async ({ assert, client }) => { 
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const response = await client.post(`/groups/${group.id}/requests`).json({}).bearerToken(token)
   })
})
