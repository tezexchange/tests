import tradebot from 'tezexchange-tradebot'

const main = async () => {
  const api_client = await tradebot.getApiClient({
    secret_key: 'edskRwCM7hMRBCFuqqAwkrvyrMiRNvA5NVjN8Neg9UfT5xUpcSRJQDb8y2HgBvwAzM6Ah9d4ykZ1HgN8N426ZYrntLES5gZv79'
  })
  const token_info = await api_client.getTokenInfo(api_client.tokens.TES, api_client.client.key_pair.public_key_hash)
  console.log(api_client)
}

main().catch(err => console.log(err))
