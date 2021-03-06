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
      localRequire.cache = {};

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
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.assert = void 0;

const assert = (name, op, client) => {
  if (!op) throw 'Assert fail: op is empty';
  console.log(`
Date: ${new Date().toLocaleString()}
Assertion: ${name}
Client: ${client.client.key_pair.public_key_hash}
Op: ${op.operation_id}`);
  return async equation_fn => {
    let is_timeout = false;
    await new Promise(resolve => {
      let count = 0;
      const t = setInterval(async () => {
        console.log('Checking operation_hashes...round ' + count);
        const ops = JSON.stringify((await client.getHeadCustom('/operation_hashes')));
        count++;
        const found_it = ops.indexOf(op.operation_id) > -1;
        const timeout = count >= 60;
        if (timeout) is_timeout = true;

        if (found_it || timeout) {
          console.log(`\x1b[${found_it ? 32 : 31}m%s\x1b[0m`, found_it ? 'Op found' : 'Timeout');
          clearInterval(t);
          resolve();
        }
      }, 15 * 1000);
    });

    if (equation_fn instanceof Function) {
      console.log('Checking equation...');
      const result = await equation_fn();
      console.log(`\x1b[${result ? 32 : 31}m%s\x1b[0m`, result ? 'PASS' : 'FAIL');
      if (!result && !is_timeout) throw `Assert fail [${name}]`;
    }
  };
};

exports.assert = assert;
},{}],"scene.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.depositToReward = exports.rewardWithdraw = exports.rewardUnlock = exports.rewardLock = exports.transferToken = exports.createSellingOrder = exports.executeBuyingOrder = exports.executeSellingOrder = exports.createBuyingOrder = exports.cancelOrder = void 0;

var _helper = require("./helper");

const genPrice = (max = 1000) => {
  return Math.round(Math.random() * max);
};

const genTez = (max = 5) => {
  return parseFloat((Math.random() * max).toFixed(6));
};

const genToken = (max = 1000) => {
  return Math.round(Math.random() * max);
};

const cancelOrder = async ({
  client,
  token,
  is_buy,
  price
}) => {
  const owner = client.client.key_pair.public_key_hash;
  const op = await client.cancelOrder(token, is_buy, price);
  await (0, _helper.assert)('Cancel order', op, client)(async () => {
    console.log(is_buy, price, owner);
    const order = (await client.getOrders()).filter(x => x.is_buy == is_buy && x.price == price && x.owner == owner);
    return !order.length;
  });
};

exports.cancelOrder = cancelOrder;

const createBuyingOrder = async ({
  client,
  token,
  price,
  tez_amount
}) => {
  price = price || genPrice();
  tez_amount = tez_amount || genTez();
  const owner = client.client.key_pair.public_key_hash;
  const orders = await client.getOrders();
  const order = orders.filter(x => x.is_buy == true && x.owner == owner && x.price == price)[0];
  const prev_tez_amount = order ? +order.tez_amount : 0;
  const op = await client.createBuying(token, price, tez_amount);
  await (0, _helper.assert)('Create buying order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == true && x.price == price && x.owner == owner)[0];
    console.log(price, tez_amount, prev_tez_amount, order.tez_amount);
    return order.tez_amount == Math.round(tez_amount * 1000000) + prev_tez_amount;
  });
  return [price, tez_amount];
};

exports.createBuyingOrder = createBuyingOrder;

const executeSellingOrder = async ({
  client,
  token,
  price,
  owner,
  tez_amount
}) => {
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
    const order = orders.filter(x => x.is_buy == false && x.price == price && x.owner == owner)[0];
    if (order) prev_token_amount = order.token_amount;else throw 'No such selling order';
  }

  tez_amount = tez_amount || genTez(price * prev_token_amount / 1000000);
  const op = await client.executeSelling(token, price, owner, tez_amount);
  await (0, _helper.assert)('Execute selling order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == false && x.price == price && x.owner == owner)[0];
    console.log(prev_token_amount, order);
    return Math.floor(tez_amount * 1000000 / price) == prev_token_amount - order.token_amount;
  });
  return [price, owner, prev_token_amount, tez_amount];
};

exports.executeSellingOrder = executeSellingOrder;

const executeBuyingOrder = async ({
  client,
  token,
  price,
  owner,
  token_amount
}) => {
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
    console.log(prev_tez_amount, order);
    return price * token_amount == prev_tez_amount - order.tez_amount;
  });
  return [price, owner, prev_tez_amount, token_amount];
};

exports.executeBuyingOrder = executeBuyingOrder;

const createSellingOrder = async ({
  client,
  token,
  price,
  token_amount
}) => {
  price = price || genPrice();
  token_amount = token_amount || genToken();
  const owner = client.client.key_pair.public_key_hash;
  const orders = await client.getOrders();
  const order = orders.filter(x => x.is_buy == false && x.owner == owner && x.price == price)[0];
  const prev_token_amount = order ? +order.token_amount : 0;
  const op = await client.createSelling(token, price, token_amount);
  await (0, _helper.assert)('Create selling order', op, client)(async () => {
    const order = (await client.getOrders()).filter(x => x.is_buy == false && x.price == price && x.owner == owner)[0];
    console.log(price, prev_token_amount, token_amount, order.token_amount);
    return order.token_amount == prev_token_amount + token_amount;
  });
  return [price, token_amount];
};

exports.createSellingOrder = createSellingOrder;

const transferToken = async ({
  client,
  token,
  receiver,
  token_amount
}) => {
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
      return sender_info.token_amount == receiver_info.token_amount && sender_info.token_amount == new_sender_info.token_amount && new_sender_info.token_amount == new_receiver_info.token_amount;
    } else {
      console.log(sender_info.token_amount, new_sender_info.token_amount, new_receiver_info.token_amount, receiver_info.token_amount);
      return sender_info.token_amount - new_sender_info.token_amount == new_receiver_info.token_amount - receiver_info.token_amount;
    }
  });
  return token_amount;
};

exports.transferToken = transferToken;

const rewardLock = async ({
  client,
  token_amount
}) => {
  const pkh = client.client.key_pair.public_key_hash;
  const tes_token = client.tokens.TES;
  const token_info = await client.getTokenInfo(tes_token, pkh);
  const prev_locked = (await client.getRewardInfo(pkh)).locked_amount || 0;
  token_amount = token_amount || genToken(token_info.token_amount);
  const op = await client.rewardLock(token_amount);
  await (0, _helper.assert)('Lock reward', op, client)(async () => {
    const locked_amount = (await client.getRewardInfo(pkh)).locked_amount;
    console.log(locked_amount, prev_locked, token_amount);
    return locked_amount == +prev_locked + token_amount;
  });
  return token_amount;
};

exports.rewardLock = rewardLock;

const rewardUnlock = async ({
  client
}) => {
  const pkh = client.client.key_pair.public_key_hash;
  const tes_token = client.tokens.TES;
  const prev_token_amount = (await client.getTokenInfo(tes_token, pkh)).token_amount;
  const prev_locked_amount = (await client.getRewardInfo(pkh)).locked_amount || 0;
  const op = await client.rewardUnlock();
  await (0, _helper.assert)('Unlock reward', op, client)(async () => {
    const token_amount = (await client.getTokenInfo(tes_token, pkh)).token_amount;
    const token_result = token_amount == +prev_locked_amount + +prev_token_amount;
    const locked_amount = (await client.getRewardInfo(pkh)).locked_amount;
    const reward_result = (locked_amount || 0) == 0;
    console.log(token_amount, locked_amount, prev_token_amount, prev_locked_amount, locked_amount);
    return token_result && reward_result;
  });
};

exports.rewardUnlock = rewardUnlock;

const rewardWithdraw = async ({
  client
}) => {
  const pkh = client.client.key_pair.public_key_hash;
  const reward_kt1 = client.contracts.reward;
  const prev_xtz = (await client.getHeadCustom('/context/contracts/' + pkh)).balance;
  const prev_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance;
  const reward_info = await client.getRewardInfo(pkh);
  const locked_amount = reward_info.locked_amount || 0;
  const rewards = reward_info.rewards.filter(x => x.date > reward_info.lock_date);
  const reward_value = rewards.reduce((acc, x) => Math.floor(locked_amount * x.xtz_amount / 100000000) + acc, 0);
  const op = await client.rewardWithdraw();
  await (0, _helper.assert)('Withdraw reward', op, client)(async () => {
    const curr_xtz = (await client.getHeadCustom('/context/contracts/' + pkh)).balance;
    const curr_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance;
    console.log(curr_xtz, prev_xtz, reward_value, curr_reward_xtz, prev_reward_xtz, reward_value);
    return curr_xtz == +prev_xtz + reward_value && curr_reward_xtz == +prev_reward_xtz - reward_value;
  });
};

exports.rewardWithdraw = rewardWithdraw;

const depositToReward = async ({
  client,
  xtz_amount
}) => {
  const pkh = client.client.key_pair.public_key_hash;
  const prev_xtz = (await client.getHeadCustom('/context/contracts/' + pkh)).balance;
  const reward_kt1 = client.contracts.reward;
  const prev_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance;
  xtz_amount = xtz_amount || genTez(+prev_xtz / 10 / 1000000);
  const op = await client.client.transfer({
    destination: reward_kt1,
    amount: xtz_amount,
    parameters: {
      "bytes": "050505030b"
    }
  });
  await (0, _helper.assert)('Deposit to reward contract', op, client)(async () => {
    const curr_reward_xtz = (await client.getHeadCustom('/context/contracts/' + reward_kt1)).balance;
    const transferred_xtz = Math.round(xtz_amount * 1000000);
    console.log(curr_reward_xtz, prev_reward_xtz, transferred_xtz);
    return curr_reward_xtz == +prev_reward_xtz + transferred_xtz;
  });
};

exports.depositToReward = depositToReward;
var _default = {
  createBuyingOrder,
  createSellingOrder,
  executeBuyingOrder,
  executeSellingOrder,
  cancelOrder,
  rewardLock,
  rewardUnlock,
  rewardWithdraw,
  depositToReward,
  transferToken // if (1) {
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

};
exports.default = _default;
},{"./helper":"helper.js"}],"index.js":[function(require,module,exports) {
"use strict";

var _tezexchangeTradebot = _interopRequireDefault(require("tezexchange-tradebot"));

var _scene = _interopRequireDefault(require("./scene"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const roll = () => {
  return Math.random() > 0.5;
};

const basicSceneComposition = async ({
  clients,
  tes_token
}) => {
  const [buying_price, _] = await _scene.default.createBuyingOrder({
    client: clients[1],
    token: tes_token
  });
  const [selling_price, __] = await _scene.default.createSellingOrder({
    client: clients[0],
    token: tes_token
  });
  await _scene.default.executeBuyingOrder({
    client: clients[0],
    owner: clients[1],
    price: buying_price,
    token: tes_token
  });
  await _scene.default.executeSellingOrder({
    client: clients[1],
    owner: clients[0],
    price: selling_price,
    token: tes_token
  });
  await _scene.default.transferToken({
    client: clients[0],
    token: tes_token
  });
  await _scene.default.cancelOrder({
    client: clients[1],
    token: tes_token,
    price: buying_price,
    is_buy: true
  });
  await _scene.default.cancelOrder({
    client: clients[0],
    token: tes_token,
    price: selling_price,
    is_buy: false
  });
  await _scene.default.rewardLock({
    client: clients[0]
  });
  await _scene.default.depositToReward({
    client: clients[0]
  });
  await _scene.default.rewardWithdraw({
    client: clients[0]
  });
  await _scene.default.rewardUnlock({
    client: clients[0]
  });
};

const loopRandomTest = async ({
  clients,
  tes_token
}) => {
  while (true) {
    if (roll()) {
      const [buying_price, _] = await _scene.default.createBuyingOrder({
        client: clients[1],
        token: tes_token
      });
      if (roll()) await _scene.default.executeBuyingOrder({
        client: clients[0],
        owner: clients[1],
        price: buying_price,
        token: tes_token
      });
      if (roll()) await _scene.default.cancelOrder({
        client: clients[1],
        token: tes_token,
        price: buying_price,
        is_buy: true
      });
    }

    if (roll()) {
      const [selling_price, __] = await _scene.default.createSellingOrder({
        client: clients[0],
        token: tes_token
      });
      if (roll()) await _scene.default.executeSellingOrder({
        client: clients[1],
        owner: clients[0],
        price: selling_price,
        token: tes_token
      });
      if (roll()) await _scene.default.cancelOrder({
        client: clients[0],
        token: tes_token,
        price: selling_price,
        is_buy: false
      });
    }

    if (roll()) {
      await _scene.default.transferToken({
        client: clients[0],
        receiver: clients[1],
        token: tes_token
      });
    }

    if (roll()) {
      await _scene.default.transferToken({
        client: clients[1],
        receiver: clients[0],
        token: tes_token
      });
    }

    if (roll()) {
      await _scene.default.rewardLock({
        client: clients[0]
      });

      if (roll()) {
        await _scene.default.depositToReward({
          client: clients[0]
        });
        await _scene.default.rewardWithdraw({
          client: clients[0]
        });
      } else await _scene.default.rewardUnlock({
        client: clients[0]
      });
    }
  }
};

const main = async () => {
  const client1 = await _tezexchangeTradebot.default.getApiClient({
    host: 'https://znetrpc.tezbox.com',
    secret_key: 'edskS5JQ4H6YzSN1BXttrXKvdBBZGdQvpkATXEErUHJuGLxDevHpdCVenc4b5tQUWUmqyPNyqa911YrUmNcp88yPubFxYnKdAY'
  });
  const client2 = await _tezexchangeTradebot.default.getApiClient({
    host: 'https://znetrpc.tezbox.com',
    secret_key: 'edskSAdL2Gdc7uMkvGZo5mm2CCzkDofWnwnvbSJbrTPzESaZTruCM8XHanMEUrJygUYaqS7NCFZ9dku4uZVbNAWUgQJZRV7NHj'
  });
  const tes_token = client1.tokens.TES; // await basicSceneComposition({
  //   clients: [client1, client2],
  //   tes_token
  // })

  await loopRandomTest({
    clients: [client1, client2],
    tes_token
  });
  console.log('Finish!');
};

main().catch(err => {
  console.log(`\x1b[31m%s\x1b[0m`, 'ERR: ' + (err instanceof Error ? err.stack : JSON.stringify(err, null, 2)));
});
},{"./scene":"scene.js"}]},{},["index.js"], null)
//# sourceMappingURL=/index.map