const ethers = require("ethers");
const ABI = require("../abi/ethflow.json");
require("dotenv").config();

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

  if (logs.length === 0) {
    throw new Error(
      `No matching log found with the order placement event hash: ${order_placement_event_hash}`
    );
  } else if (logs.length > 1) {
    throw new Error(
      `More than one log found with the order placement event hash: ${order_placement_event_hash}`
    );
  }

  const log = logs[0];
  const ethflow_address = ethers.utils.getAddress(log.address);
  const order = iface.parseLog(log).args.order;
  console.log(
    `trying to invalidate the following order on eth-flow contract at ${ethflow_address}:`,
    order
  );

  const { gas_estimate_tx, raw_tx } = await buildInvalidateOrderTx({
    ethflow_address,
    tx,
    log,
    provider,
    iface,
  });
  // checks whether the gas is failing
  const gas_estimation = await provider.estimateGas(gas_estimate_tx);
  // Creating a signing account from a private key
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const new_tx = await signer.sendTransaction(raw_tx);
  console.log("Mining transaction...");
  // Waiting for the transaction to be mined
  const new_receipt = await new_tx.wait();
  // The transaction is now on chain!
  console.log(
    `Mined transaction (see in its corresponding block explorer): ${new_receipt.transactionHash}`
  );
}

async function buildInvalidateOrderTx({
  tx,
  ethflow_address,
  log,
  provider,
  iface,
}) {
  if (tx.to.toLowerCase() !== ethflow_address.toLowerCase()) {
    console.log(
      "Detected a tx that wasn't interacted with the ETHflow contract directly"
    );

    const [order] = ethers.utils.defaultAbiCoder.decode(
      [iface.getFunction("invalidateOrder").inputs[0]],
      log.data
    );

    const invalidate_order_data = iface.encodeFunctionData("invalidateOrder", [
      order,
    ]);

    const new_raw_tx = {
      to: ethflow_address,
      data: invalidate_order_data,
      value: "0x0",
    };

    if (!process.env.PRIVATE_KEY) {
      throw new Error(
        "PRIVATE_KEY env variable is required to sign non-direct interaction tx"
      );
    }

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const signed_tx = await signer.signTransaction(new_raw_tx);

    return { gas_estimate_tx: signed_tx, raw_tx: new_raw_tx };
  } else {
    const new_raw_tx = {
      to: ethflow_address,
      data: "0x7bc41b96" + tx.data.substring(10),
      value: ethers.utils.parseUnits("0", "ether"),
    };

    return { gas_estimate_tx: new_raw_tx, raw_tx: new_raw_tx };
  }
}

main();
