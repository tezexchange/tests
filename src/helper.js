export const assert = (name, op, client) => {
  if (!op)
    throw 'Assert fail: op is empty'

  console.log(`
Date: ${(new Date()).toLocaleString()}
Assertion: ${name}
Client: ${client.client.key_pair.public_key_hash}
Op: ${op.operation_id}`)

  return async (equation_fn) => {
    let is_timeout = false
    await new Promise(resolve => {
      let count = 0
      const t = setInterval(async () => {
        console.log('Checking operation_hashes...round ' + count)
        const ops = JSON.stringify(await client.getHeadCustom('/operation_hashes'))
        count++
        const found_it = ops.indexOf(op.operation_id) > -1
        const timeout = count >= 60
        if (timeout) is_timeout = true

        if (found_it || timeout) {
          console.log(`\x1b[${found_it ? 32 : 31}m%s\x1b[0m`, found_it ? 'Op found' : 'Timeout')
          clearInterval(t)
          resolve()
        }
      }, 15 * 1000)
    })

    if (equation_fn instanceof Function) {
      console.log('Checking equation...')
      const result = await equation_fn()
      console.log(`\x1b[${result ? 32 : 31}m%s\x1b[0m`, result ? 'PASS' : 'FAIL')

      if (!result && !is_timeout)
        throw `Assert fail [${name}]` 
    }
  }
}