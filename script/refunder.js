const ethers = require("ethers");
const ABI = require("../abi/ethflow.json");
require("dotenv").config();

const CREATE_ORDER_SELECTOR = "322bba21";
const ETHFLOW_ORDER_LENGTH = 576;

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.NODE_URL);
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
      // topic0 is required by the iface.parseLog() function
      log.topics[0] === order_placement_event_hash
  );

  if (logs.length !== 1) {
    throw new Error(
      `Expected only 1 log with the OrderPlacement event, found ${logs.length}`
    );
  }

  const log = logs[0];
  const ethflow_address = ethers.utils.getAddress(log.address);
  const order = iface.parseLog(log).args.order;
  console.log(
    `trying to invalidate the following order on eth-flow contract at ${ethflow_address}:`,
    order
  );

  const eth_flow_order_bytes = await getEthFlowOrderBytes(tx, ethflow_address);
  // Make sure the EthFlowOrder can be parsed
  const [eth_flow_order] = ethers.utils.defaultAbiCoder.decode(
    [iface.getFunction("invalidateOrder").inputs[0]],
    "0x" + eth_flow_order_bytes
  );
  // Encode the invalidateOrder function
  const invalidate_order_data = iface.encodeFunctionData("invalidateOrder", [
    eth_flow_order,
  ]);
  const new_raw_tx = {
    to: ethflow_address,
    data: invalidate_order_data,
    value: ethers.utils.parseUnits("0", "ether"),
  };
  // checks whether the gas is failing
  const gas_estimation = await provider.estimateGas(new_raw_tx);
  // Creating a signing account from a private key
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const new_tx = await signer.sendTransaction(new_raw_tx);
  console.log("Mining transaction...");
  // Waiting for the transaction to be mined
  const new_receipt = await new_tx.wait();
  // The transaction is now on chain!
  console.log(
    `Mined transaction (see in its corresponding block explorer): ${new_receipt.transactionHash}`
  );
}

async function getEthFlowOrderBytes(tx, ethflow_address) {
  if (tx.to.toLowerCase() === ethflow_address.toLowerCase()) {
    return tx.data.substring(10);
  } else {
    console.log(
      "Detected a tx that wasn't interacted with the ETHflow contract directly"
    );

    const create_order_index = tx.data.indexOf(CREATE_ORDER_SELECTOR);
    if (create_order_index === -1) {
      throw new Error("createOrder function selector not found in tx.data.");
    }

    const order_start = create_order_index + CREATE_ORDER_SELECTOR.length;
    return tx.data.substring(order_start, order_start + ETHFLOW_ORDER_LENGTH);
  }
}

main();
