import bs58check from 'bs58check'

import tradebot from 'tezexchange-tradebot'

const main = async () => {
  const api_client = await tradebot.getApiClient({
    secret_key: 'edskRwCM7hMRBCFuqqAwkrvyrMiRNvA5NVjN8Neg9UfT5xUpcSRJQDb8y2HgBvwAzM6Ah9d4ykZ1HgN8N426ZYrntLES5gZv79'
  })
  const token_info = await api_client.getTokenInfo(api_client.tokens.TES, api_client.client.key_pair.public_key_hash)
  // const result = await api_client.createBuying(api_client.tokens.TES, 210, 1)
  const result = await api_client.getOrders()
  console.log(result)
}

main().catch(err => console.log(err))
