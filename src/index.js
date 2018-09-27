import tradebot from 'tezexchange-tradebot'
import Scene from './scene'

const basicSceneComposition = async ({clients, tes_token}) => {
  // const [price, _] = await Scene.createBuyingOrder({client: clients[1], token: tes_token})
  const [price, _] = await Scene.createSellingOrder({client: clients[0], token: tes_token})
  // await Scene.executeBuyingOrder({client: clients[0], owner: clients[1], price, token: tes_token})
  await Scene.executeSellingOrder({client: clients[1], owner: clients[0], price, token: tes_token})
  // await Scene.transferToken({client: clients[0], token: tes_token})
}

const main = async () => {
  const client1 = await tradebot.getApiClient({
    // host: 'https://znetrpc.tezbox.com',
    secret_key: 'edskRwCM7hMRBCFuqqAwkrvyrMiRNvA5NVjN8Neg9UfT5xUpcSRJQDb8y2HgBvwAzM6Ah9d4ykZ1HgN8N426ZYrntLES5gZv79'
  })
  const client2 = await tradebot.getApiClient({
    secret_key: 'edskSAnVuT9KDLx77DECAWcqocUzE4KerS7WGaUHCVyRWrYk29RHiY5gWZPVa28EPYYbZKPYg8WaSRbvahGbTCQAJFJ31JiFBu'
  })

  const tes_token = client1.tokens.TES

  await basicSceneComposition({
    clients: [client1, client2],
    tes_token
  })

  console.log('Finish!')
}

main().catch(err => {
  console.log(`\x1b[31m%s\x1b[0m`, 'ERR: ' + (err instanceof Error ? err : JSON.stringify(err, null, 2)))
})
