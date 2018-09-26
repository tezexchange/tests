import tradebot from 'tezexchange-tradebot'

const main = async () => {
  const api_client = await tradebot.getApiClient({
    // host: 'https://znetrpc.tezbox.com',
    secret_key: 'edskRwCM7hMRBCFuqqAwkrvyrMiRNvA5NVjN8Neg9UfT5xUpcSRJQDb8y2HgBvwAzM6Ah9d4ykZ1HgN8N426ZYrntLES5gZv79'
  })

  const pkh = api_client.client.key_pair.public_key_hash
  const tes_token = api_client.tokens.TES

  if (0) {
    // const op = await api_client.createBuying(tes_token, 210, 1)
    // const op = await api_client.createSelling(tes_token, 342, 100)
    // const op = await api_client.executeSelling(tes_token, 231, 'tz1UJPFiywU6uGeMpZnPrY4w7zNhLekvJaUo', 342 * 100 / 1000000)
    const op = await api_client.executeBuying(tes_token, 210, 'tz1UJPFiywU6uGeMpZnPrY4w7zNhLekvJaUo', 100)
    // const op = await api_client.cancelOrder(tes_token, false, 342)
    // const op = await api_client.rewardLock(1000)
    // const op = await api_client.rewardUnlock()
    // const op = await api_client.rewardWithDraw()
    // const op = await api_client.tokenTransfer(tes_token, tes_token, 300)
    console.log(op)
  } else {
    // const result = await api_client.getTokenInfo(tes_token, pkh)
    const result = await api_client.getOrders()
    // const result = await api_client.getRewardInfo(pkh)
    console.log(result)
  }

}

main().catch(err => {
  console.log('ERR:' + err instanceof Error ? err : JSON.stringify(err, null, 2))
})
