const ethers = require("ethers");
const ABI = require("../abi/ethflow.json");
require("dotenv").config();

async function main() {
  const NODE_URL = process.env.NODE_URL;
  const ETHFLOW_TX_HASH = process.env.ETHFLOW_TX_HASH;

  if (!NODE_URL || !ETHFLOW_TX_HASH) {
    throw new Error("Both NODE_URL and ETHFLOW_TX_HASH must be provided");
  }

  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);
  const tx_hash =
    process.env.ETHFLOW_TX_HASH ||
    "0x1416bc69abce952dc42578ea5bbeacd6dbbf15130d30d6305a686a2fb5a6690f";
  const tx = await provider.getTransaction(tx_hash);
  const receipt = await tx.wait();
  const iface = new ethers.utils.Interface(ABI);
  const order_placement_event_hash =
    "0xcf5f9de2984132265203b5c335b25727702ca77262ff622e136baa7362bf1da9";
  const logs = receipt.logs.filter(
    (log) =>
      // iface.parseLog() cares only about the topic0
      log.topics[0] === order_placement_event_hash
  );

  if (logs.length !== 1) {
    throw new Error(
      `Expected only 1 log with the OrderPlacement event, found ${logs.length}`
    );
  }

  const log = logs[0];
  const ethflow_address = ethers.utils.getAddress(log.address);
  // GPv2Order.Data: https://github.com/cowprotocol/ethflowcontract/blob/main/src/vendored/GPv2Order.sol#L18-L31
  const order = iface.parseLog(log).args.order;
  console.log(
    `trying to invalidate the following order on eth-flow contract at ${ethflow_address}:`,
    order
  );
  // EthFlowOrder.Data: https://github.com/cowprotocol/ethflowcontract/blob/main/src/libraries/EthFlowOrder.sol#L19-L45
  const ethflow_order = {
    buyToken: order.buyToken,
    receiver: order.receiver,
    sellAmount: order.sellAmount,
    buyAmount: order.buyAmount,
    appData: order.appData,
    feeAmount: order.feeAmount,
    validTo: order.validTo,
    partiallyFillable: order.partiallyFillable,
    // The parsed GPv2Order doesn't contain this field, which doesn't participate in the hash function,
    // so it can be set to defaults.
    quoteId: 0,
  };

  // Encode the invalidateOrder function
  const invalidate_order_data = iface.encodeFunctionData("invalidateOrder", [
    ethflow_order,
  ]);
  const new_raw_tx = {
    to: ethflow_address,
    data: invalidate_order_data,
    value: ethers.utils.parseUnits("0", "ether"),
  };
  // checks whether the gas is failing
  const gas_estimation = await provider.estimateGas(new_raw_tx);

  let private_key = process.env.PRIVATE_KEY;
  if (!private_key) {
    throw new Error(
      "In order to send a transaction, a PRIVATE_KEY must be provided"
    );
  }
  // Creating a signing account from a private key
  const signer = new ethers.Wallet(private_key, provider);
  const new_tx = await signer.sendTransaction(new_raw_tx);
  console.log("Mining transaction...");
  // Waiting for the transaction to be mined
  const new_receipt = await new_tx.wait();
  // The transaction is now on chain!
  console.log(
    `Mined transaction (see in its corresponding block explorer): ${new_receipt.transactionHash}`
  );
}

main();
