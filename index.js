require('dotenv').config()
const fs = require('fs')
const { get } = require('http')
const path = require('path')
const { VK } = require('vk-io')

const CONFIG = getConfig()

const vk = new VK({
  token: CONFIG.token
})

function randomInt() {
  // Return random int (for message id for example)
  return Math.floor(Math.random() * 2147483647.0)
}

async function timeOut(sec) {
  // Timeout sec second
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), sec * 1000)
  })
}

function getConfig() {
  // Return config (js object)
  try {
    return {
      token: process.env.TOKEN,
      message: process.env.MESSAGE,
      adminId: process.env.ADMIN_ID
    }
  } catch (error) {
    throw new Error('Doesnt have all process env')
  }
}

function getSendedIdList() {
  // Return sended id list 
  return fs.readFileSync(path.resolve(__dirname, 'sendedIdList.txt'), 'utf-8').split(' ').map(id => parseInt(id))
}

function addIdToSendedIdList(id) {
  // Add id to sended list
  fs.appendFileSync(path.resolve(__dirname, 'sendedIdList.txt'), ' ' + id.toString())
}

function getErrorIdList() {
  return fs.readFileSync(path.resolve(__dirname, 'errorIdList.txt'), 'utf-8').split(' ').map(id => parseInt(id))
}

function addIdToErrorIdList(id) {
  const errorIdList = getErrorIdList()
  if (!errorIdList.includes(id)) {
    fs.appendFileSync(path.resolve(__dirname, 'errorIdList.txt'), id.toString() + ' ')
  }
}

async function getUser(user_id) {
  return (await vk.api.users.get({ user_id }))[0]
}

async function sendMessage(user_id, message) {
  // Send message to user_id (get text message from config)
  const user = (await vk.api.users.get({ user_id }))[0]
  const userName = user.first_name
  return await vk.api.messages.send({
    user_id,
    random_id: randomInt(),
    message: message ?? `${userName}, ` + CONFIG.message
  })
}

async function getFriendsRequests(count = 1000, offset = 0) {
  // Return not viewed friends requests 
  return await vk.api.friends.getRequests({
    offset,
    count,
    extended: 0,
    need_viewed: 0,
    sort: 0
  })
}

async function getUnansweredFriendsRequest() {
  // Return all unanswered friends requests 
  const friendsRequests = await getFriendsRequests()
  const sendedIdList = getSendedIdList()

  return friendsRequests.items.filter(id => !sendedIdList.includes(id))
}

async function sendMessageAllUnansweredFriendsRequest() {
  // Send message all (max - 19 per day) unanswered friends request
  const unsendedId = await getUnansweredFriendsRequest()

  for (userId of unsendedId) {
    try {
      const res = await sendMessage(userId)
      console.log(res)
      addIdToSendedIdList(userId)
    } catch (err) {
      addIdToErrorIdList(userId)
      console.log('err')
    }
  }
}

async function sendMessageToUnansweredFriendsRequestEachDay() {
  // Send message to unanswered friends request each day
  setInterval(sendMessageAllUnansweredFriendsRequest, 86400 * 1000)
}

async function onHosting() {
  // Chek work
  const owner = await getUser()
  sendMessage(CONFIG.adminId, `Автоответчик успешно запущен для ${owner.first_name} ${owner.last_name}`)
}

(async () => {
  onHosting()
  sendMessageToUnansweredFriendsRequestEachDay()

  while (true) {
    // Every 60 sec send message to new unanswered friends request
    await sendMessageAllUnansweredFriendsRequest()
    await timeOut(60)
  }
})()