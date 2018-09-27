// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({"helper.js":[function(require,module,exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
const assert = exports.assert = (name, op, client) => {
  if (!op) throw 'Assert fail: op is empty';

  console.log(`
Assertion: ${name}
Client: ${client.client.key_pair.public_key_hash}
Op: ${op.operation_id}`);

  return async equation_fn => {
    await new Promise(resolve => {
      let count = 0;
      const t = setInterval(async () => {
        console.log('Checking operation_hashes...round ' + count);
        const ops = JSON.stringify((await client.getHeadCustom('/operation_hashes')));
        count++;
        const found_it = ops.indexOf(op.operation_id) > -1;
        const timeout = count >= 5;
        if (found_it || timeout) {
          console.log(`\x1b[${found_it ? 32 : 31}m%s\x1b[0m`, found_it ? 'Op found' : 'Timeout');
          clearInterval(t);
          resolve();
        }
      }, 25 * 1000);
    });

    if (equation_fn instanceof Function) {
      console.log('Checking equation...');
      const result = await equation_fn();
      console.log(`\x1b[${result ? 32 : 31}m%s\x1b[0m`, result ? 'PASS' : 'FAIL');

      if (!result) throw `Assert fail [${name}] @ 
${equation_fn.toString()}
      `;
    }
  };
};
},{}],"scene.js":[function(require,module,exports) {
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transferToken = exports.createSellingOrder = exports.executeBuyingOrder = exports.executeSellingOrder = exports.createBuyingOrder = undefined;

var _helper = require('./helper');

const genPrice = (max = 1000) => {
  return Math.round(Math.random() * max);
};

const genTez = (max = 5) => {
  return parseFloat((Math.random() * max).toFixed(6));
};

const genToken = (max = 1000) => {
  return Math.round(Math.random() * max);
};

const createBuyingOrder = exports.createBuyingOrder = async ({ client, token, price, tez_amount }) => {
  price = price || genPrice();
  tez_amount = tez_amount || genTez();

  const op = await client.createBuying(token, price, tez_amount);
  await (0, _helper.assert)('Create buying order', op, client)(async () => (await client.getOrders()).filter(x => x.price == price && x.tez_amount == tez_amount * 1000000).length);

  return [price, tez_amount];
};

const executeSellingOrder = exports.executeSellingOrder = async ({ client, token, price, owner, tez_amount }) => {
  const orders = await client.getOrders();
  let prev_token_amount = '';

  if (!price || !owner) {
    const order = orders.filter(x => x.is_buy == false)[0];
    if (order) {
      price = order.price;
      owner = order.owner;
      prev_token_amount = order.token_amount;
    } else {
      throw 'No selling order to be executed';
    }
  } else {
    owner = owner.client.key_pair.public_key_hash;
    console.log(price, owner, orders);
    const order = orders.filter(x => x.is_buy == false && x.price == price && x.owner == owner)[0];
    if (order) prev_token_amount = order.token_amount;else throw 'No such selling order';
  }

  tez_amount = tez_amount || genTez(price * prev_token_amount / 1000000);

  const op = await client.executeSelling(token, price, owner, tez_amount);
  await (0, _helper.assert)('Execute selling order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == false && x.price == price && x.owner == owner)[0];
    return Math.floor(tez_amount * 1000000 / price) == prev_token_amount - order.token_amount;
  });

  return [price, owner, prev_token_amount, tez_amount];
};

const executeBuyingOrder = exports.executeBuyingOrder = async ({ client, token, price, owner, token_amount }) => {
  const orders = await client.getOrders();
  let prev_tez_amount = '';

  if (!price || !owner) {
    const order = orders.filter(x => x.is_buy == true)[0];
    if (order) {
      price = order.price;
      owner = order.owner;
      prev_tez_amount = order.tez_amount;
    } else {
      throw 'No buying order to be executed';
    }
  } else {
    owner = owner.client.key_pair.public_key_hash;
    const order = orders.filter(x => x.is_buy == true && x.price == price && x.owner == owner)[0];
    if (order) prev_tez_amount = order.tez_amount;else throw 'No such buying order';
  }

  token_amount = token_amount || genToken(prev_tez_amount / price);

  const op = await client.executeBuying(token, price, owner, token_amount);
  await (0, _helper.assert)('Execute buying order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == true && x.price == price && x.owner == owner)[0];
    return price * token_amount == prev_tez_amount - order.tez_amount;
  });

  return [price, owner, prev_tez_amount, token_amount];
};

const createSellingOrder = exports.createSellingOrder = async ({ client, token, price, token_amount }) => {
  price = price || genPrice();
  token_amount = token_amount || genToken();

  const op = await client.createSelling(token, price, token_amount);
  await (0, _helper.assert)('Create selling order', op, client)(async () => (await client.getOrders()).filter(x => x.price == price && x.token_amount == token_amount).length);

  return [price, token_amount];
};

const transferToken = exports.transferToken = async ({ client, token, receiver, token_amount }) => {
  const sender = client.client.key_pair.public_key_hash;
  receiver = receiver ? receiver.client.key_pair.public_key_hash : sender;
  token_amount = token_amount || genToken();

  const sender_info = await client.getTokenInfo(token, sender);
  const receiver_info = await client.getTokenInfo(token, receiver);

  const op = await client.tokenTransfer(token, receiver, token_amount);
  await (0, _helper.assert)('Transfer token', op, client)(async () => {
    const new_sender_info = await client.getTokenInfo(token, sender);
    const new_receiver_info = await client.getTokenInfo(token, receiver);

    if (receiver === sender) {
      return sender_info.token_amount === receiver_info.token_amount && sender_info.token_amount === new_sender_info.token_amount && new_sender_info.token_amount === new_receiver_info.token_amount;
    } else {
      return sender_info.token_amount - new_sender_info.token_amount === new_receiver_info.token_amount - receiver_info.token_amount;
    }
  });

  return token_amount;
};

exports.default = {
  createBuyingOrder,
  createSellingOrder,
  executeBuyingOrder,
  executeSellingOrder,
  transferToken

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

};
},{"./helper":"helper.js"}],"index.js":[function(require,module,exports) {
'use strict';

var _tezexchangeTradebot = require('tezexchange-tradebot');

var _tezexchangeTradebot2 = _interopRequireDefault(_tezexchangeTradebot);

var _scene = require('./scene');

var _scene2 = _interopRequireDefault(_scene);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const basicSceneComposition = async ({ clients, tes_token }) => {
  // const [price, _] = await Scene.createBuyingOrder({client: clients[1], token: tes_token})
  const [price, _] = await _scene2.default.createSellingOrder({ client: clients[0], token: tes_token });
  // await Scene.executeBuyingOrder({client: clients[0], owner: clients[1], price, token: tes_token})
  await _scene2.default.executeSellingOrder({ client: clients[1], owner: clients[0], price, token: tes_token });
  // await Scene.transferToken({client: clients[0], token: tes_token})
};

const main = async () => {
  const client1 = await _tezexchangeTradebot2.default.getApiClient({
    // host: 'https://znetrpc.tezbox.com',
    secret_key: 'edskRwCM7hMRBCFuqqAwkrvyrMiRNvA5NVjN8Neg9UfT5xUpcSRJQDb8y2HgBvwAzM6Ah9d4ykZ1HgN8N426ZYrntLES5gZv79'
  });
  const client2 = await _tezexchangeTradebot2.default.getApiClient({
    secret_key: 'edskSAnVuT9KDLx77DECAWcqocUzE4KerS7WGaUHCVyRWrYk29RHiY5gWZPVa28EPYYbZKPYg8WaSRbvahGbTCQAJFJ31JiFBu'
  });

  const tes_token = client1.tokens.TES;

  await basicSceneComposition({
    clients: [client1, client2],
    tes_token
  });

  console.log('Finish!');
};

main().catch(err => {
  console.log(`\x1b[31m%s\x1b[0m`, 'ERR: ' + (err instanceof Error ? err : JSON.stringify(err, null, 2)));
});
},{"./scene":"scene.js"}]},{},["index.js"], null)
//# sourceMappingURL=/index.map