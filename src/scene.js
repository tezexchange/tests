import { assert } from './helper'

const genPrice = (max = 1000) => {
  return Math.round(Math.random() * max)
}

const genTez = (max = 5) => {
  return parseFloat((Math.random() * max).toFixed(6))
}

const genToken = (max = 1000) => {
  return Math.round(Math.random() * max)
}

export const cancelOrder = async ({client, token, is_buy, price}) => {
  const owner = client.client.key_pair.public_key_hash
  const op = await client.cancelOrder(token, is_buy, price)
  await assert('Cancel order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == is_buy && x.price == price && x.owner == owner)
    return !order.length
  })
}

export const createBuyingOrder = async ({client, token, price, tez_amount}) => {
  price = price || genPrice()
  tez_amount = tez_amount || genTez()

  const owner = client.client.key_pair.public_key_hash
  const orders = await client.getOrders()
  const order = orders.filter(x => x.is_buy == true && x.owner == owner && x.price == price)[0]
  const prev_tez_amount = order ? +order.tez_amount : 0

  const op = await client.createBuying(token, price, tez_amount)
  await assert('Create buying order', op, client)(async () => 
    (await client.getOrders()).filter(x => x.is_buy == true && x.price == price && x.tez_amount == tez_amount * 1000000 + prev_tez_amount).length
  )

  return [price, tez_amount]
}

export const executeSellingOrder = async ({client, token, price, owner, tez_amount}) => {
  const orders = await client.getOrders()
  let prev_token_amount = ''

  if (!price || !owner) {
    const order = orders.filter(x => x.is_buy == false)[0]
    if (order) {
      price = order.price
      owner = order.owner
      prev_token_amount = order.token_amount
    } else {
      throw 'No selling order to be executed'
    }
  } else {
    owner = owner.client.key_pair.public_key_hash
    const order = orders.filter(x => x.is_buy == false && x.price == price && x.owner == owner)[0]
    if (order)
      prev_token_amount = order.token_amount
    else 
      throw 'No such selling order'
  }

  tez_amount = tez_amount || genTez(price * prev_token_amount / 1000000)

  const op = await client.executeSelling(token, price, owner, tez_amount)
  await assert('Execute selling order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == false && x.price == price && x.owner == owner)[0]
    return Math.floor((tez_amount * 1000000) / price) == prev_token_amount - order.token_amount
  })

  return [price, owner, prev_token_amount, tez_amount]
}

export const executeBuyingOrder = async ({client, token, price, owner, token_amount}) => {
  const orders = await client.getOrders()
  let prev_tez_amount = ''

  if (!price || !owner) {
    const order = orders.filter(x => x.is_buy == true)[0]
    if (order) {
      price = order.price
      owner = order.owner
      prev_tez_amount = order.tez_amount
    } else {
      throw 'No buying order to be executed'
    }
  } else {
    owner = owner.client.key_pair.public_key_hash
    const order = orders.filter(x => x.is_buy == true && x.price == price && x.owner == owner)[0]
    if (order)
      prev_tez_amount = order.tez_amount
    else 
      throw 'No such buying order'
  }

  token_amount = token_amount || genToken(prev_tez_amount / price)

  const op = await client.executeBuying(token, price, owner, token_amount)
  await assert('Execute buying order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == true && x.price == price && x.owner == owner)[0]
    return price * token_amount == prev_tez_amount - order.tez_amount
  })

  return [price, owner, prev_tez_amount, token_amount]
}

export const createSellingOrder = async ({client, token, price, token_amount}) => {
  price = price || genPrice()
  token_amount = token_amount || genToken()

  const owner = client.client.key_pair.public_key_hash
  const orders = await client.getOrders()
  const order = orders.filter(x => x.is_buy == false && x.owner == owner && x.price == price)[0]
  const prev_token_amount = order ? +order.token_amount : 0

  const op = await client.createSelling(token, price, token_amount)
  await assert('Create selling order', op, client)(async () => 
    (await client.getOrders()).filter(x => x.is_buy == false && x.price == price && x.token_amount == prev_token_amount + token_amount).length
  )

  return [price, token_amount]
}

export const transferToken = async ({client, token, receiver, token_amount}) => {
  const sender = client.client.key_pair.public_key_hash
  receiver = receiver ? receiver.client.key_pair.public_key_hash : sender
  token_amount = token_amount || genToken()

  const sender_info = await client.getTokenInfo(token, sender)
  const receiver_info = await client.getTokenInfo(token, receiver)

  const op = await client.tokenTransfer(token, receiver, token_amount)
  await assert('Transfer token', op, client)(async () => {
    const new_sender_info = await client.getTokenInfo(token, sender)
    const new_receiver_info = await client.getTokenInfo(token, receiver)

    if (receiver === sender) {
      return sender_info.token_amount === receiver_info.token_amount &&
             sender_info.token_amount === new_sender_info.token_amount &&
             new_sender_info.token_amount === new_receiver_info.token_amount
    } else {
      return sender_info.token_amount - new_sender_info.token_amount === 
             new_receiver_info.token_amount - receiver_info.token_amount
    }
  })

  return token_amount
}

export const rewardLock = async ({client, token_amount}) => {
  const pkh = client.client.key_pair.public_key_hash
  const tes_token = client.tokens.TES
  const token_info = await client.getTokenInfo(tes_token, pkh)
  const prev_locked = (await client.getRewardInfo(pkh)).locked_amount || 0

  token_amount = token_amount || genToken(token_info.token_amount)

  const op = await client.rewardLock(token_amount)
  await assert('Lock reward', op, client)(async () => 
    (await client.getRewardInfo(pkh)).locked_amount == +prev_locked + token_amount
  )

  return token_amount
}

export const rewardUnlock = async ({client}) => {
  const pkh = client.client.key_pair.public_key_hash
  const tes_token = client.tokens.TES
  const prev_token_amount = (await client.getTokenInfo(tes_token, pkh)).token_amount
  const locked_amount = (await client.getRewardInfo(pkh)).locked_amount || 0

  const op = await client.rewardUnlock()
  await assert('Unlock reward', op, client)(async () => {
    const token_result = (await client.getTokenInfo(tes_token, pkh)).token_amount == +locked_amount + +prev_token_amount
    const reward_result =  ((await client.getRewardInfo(pkh)).locked_amount || 0) == 0
    return token_result && reward_result
  })
}

export const rewardWithdraw = async ({client}) => {
  const pkh = client.client.key_pair.public_key_hash
  const reward_kt1 = client.contracts.reward
  const prev_xtz = (await client.getHeadCustom('/context/contracts/' + pkh)).balance
  const prev_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance
  const reward_info = await client.getRewardInfo(pkh)
  const locked_amount = reward_info.locked_amount || 0
  const rewards = reward_info.rewards.filter(x => x.date > reward_info.lock_date)
  const reward_value = rewards.reduce((acc, x) => Math.floor(locked_amount * x.xtz_amount / 100000000) + acc, 0)

  const op = await client.rewardWithdraw()
  await assert('Withdraw reward', op, client)(async () => {
    const curr_xtz = (await client.getHeadCustom('/context/contracts/' + pkh)).balance
    const curr_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance
    return curr_xtz == +prev_xtz + reward_value && curr_reward_xtz == +prev_reward_xtz - reward_value
  })
}

export const depositToReward = async ({client, xtz_amount}) => {
  const pkh = client.client.key_pair.public_key_hash
  const prev_xtz = (await client.getHeadCustom('/context/contracts/' + pkh)).balance
  const reward_kt1 = client.contracts.reward
  const prev_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance

  xtz_amount = xtz_amount || genTez(+prev_xtz / 10 / 1000000)
  const op = await client.client.transfer({
    destination: reward_kt1,
    amount: xtz_amount,
    parameters: {
      "bytes": "050505030b"
    }
  })
  await assert('Deposit to reward contract', op, client)(async () => {
    const curr_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance
    const transferred_xtz = xtz_amount * 1000000
    return curr_reward_xtz == +prev_reward_xtz + transferred_xtz
  })
}

export default {
  createBuyingOrder,
  createSellingOrder,
  executeBuyingOrder,
  executeSellingOrder,
  cancelOrder,
  rewardLock,
  rewardUnlock,
  rewardWithdraw,
  depositToReward,
  transferToken
}

  // if (1) {
  //   // const op = await client1.createBuying(tes_token, 210, 1)
  //   // const op = await client1.createSelling(tes_token, 342, 100)
  //   // const op = await client1.executeSelling(tes_token, 231, 'tz1UJPFiywU6uGeMpZnPrY4w7zNhLekvJaUo', 342 * 100 / 1000000)
  //   const op = await client1.executeBuying(tes_token, 210, 'tz1UJPFiywU6uGeMpZnPrY4w7zNhLekvJaUo', 100)
  //   // const op = await client1.cancelOrder(tes_token, false, 342)
  //   // const op = await client1.rewardLock(1000)
  //   // const op = await client1.rewardUnlock()
  //   // const op = await client1.rewardWithdraw()
  //   // const op = await client1.tokenTransfer(tes_token, tes_token, 300)
  //   console.log(op)
  // } else {
  //   // const result = await client1.getTokenInfo(tes_token, pkh)
  //   // const result = await client1.getOrders()
  //   // const result = await client1.getRewardInfo(pkh)
  //   const result = await client1.getHeadCustom('/operation_hashes')
  //   console.log(result)
  // }