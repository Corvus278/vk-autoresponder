const fs = require('fs')
const { get } = require('http')
const path = require('path')
const { VK } = require('vk-io')

const vk = new VK({
  token: getToken()
})

const CONFIG = getConfig()

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
    const configDataJSON = fs.readFileSync(path.resolve(__dirname, 'config.json'), 'utf8')
    return JSON.parse(configDataJSON)
  } catch (error) {
    throw new Error('Doesnt have config file, or he will not can parse from JSON')
  }
}

function getToken() {
  // Return token from config
  const CONFIG = getConfig()
  if (CONFIG.token) {
    return CONFIG.token
  } else {
    throw new Error('Config doesnt have token')
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

async function sendMessage(user_id) {
  // Send message to user_id (get text message from config)
  const user = (await vk.api.users.get({ user_id }))[0]
  const userName = user.first_name
  const message = `${userName}, ` + CONFIG.message
  return await vk.api.messages.send({
    user_id,
    random_id: randomInt(),
    message
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
  // Send message all (max - 14 per day) unanswered friends request
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

(async () => {
  sendMessageToUnansweredFriendsRequestEachDay()

  while (true) {
    // Every 60 sec send message to new unanswered friends request
    await sendMessageAllUnansweredFriendsRequest()
    await timeOut(60)
  }
})()