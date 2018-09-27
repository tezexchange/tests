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

export const createBuyingOrder = async ({client, token, price, tez_amount}) => {
  price = price || genPrice()
  tez_amount = tez_amount || genTez()

  const op = await client.createBuying(token, price, tez_amount)
  await assert('Create buying order', op, client)(async () => 
    (await client.getOrders()).filter(x => x.price == price && x.tez_amount == tez_amount * 1000000).length
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
    console.log(price, owner, orders)
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

  const op = await client.createSelling(token, price, token_amount)
  await assert('Create selling order', op, client)(async () => 
    (await client.getOrders()).filter(x => x.price == price && x.token_amount == token_amount).length
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


export default {
  createBuyingOrder,
  createSellingOrder,
  executeBuyingOrder,
  executeSellingOrder,
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
  //   // const op = await client1.rewardWithDraw()
  //   // const op = await client1.tokenTransfer(tes_token, tes_token, 300)
  //   console.log(op)
  // } else {
  //   // const result = await client1.getTokenInfo(tes_token, pkh)
  //   // const result = await client1.getOrders()
  //   // const result = await client1.getRewardInfo(pkh)
  //   const result = await client1.getHeadCustom('/operation_hashes')
  //   console.log(result)
  // }