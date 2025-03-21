const ethers = require("ethers");
const readline = require("readline");
const yn = require("yn").default;
const ABI = require("../abi/ethflow.json");
require("dotenv").config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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
  const log = receipt.logs.find(
    (log) =>
      // topic0 is required by the iface.parseLog() function
      log.topics[0] === order_placement_event_hash
  );
  if (!log) {
    throw new Error(
      `No matching log found with the order placement event hash: ${order_placement_event_hash}`
    );
  }
  const ethflow_address = ethers.utils.getAddress(log.address);
  const order = iface.parseLog(log).args.order;
  console.log(
    `trying to invalidate the following order on eth-flow contract at ${ethflow_address}:`,
    order
  );

  if (receipt.to.toLowerCase() !== ethflow_address.toLowerCase()) {
    console.log(
      "⚠️ Warning: This transaction was not a direct interaction with the eth-flow contract!"
    );

    const user_response = await askForConfirmation(
      "Do you want to proceed with the refund? (yes/no): "
    );
    if (!user_response) {
      console.log("Refund process aborted by user.");
      return;
    }
  }

  const ethflow_order = ethers.utils.defaultAbiCoder.decode(
    [iface.getFunction("invalidateOrder").inputs[0]],
    log.data
  );
  const invalidate_order_data = iface.encodeFunctionData("invalidateOrder", [
    ethflow_order.order,
  ]);

  // Creating and sending the transaction object
  const new_raw_tx = {
    to: ethflow_address,
    data: invalidate_order_data,
    value: "0x0",
  };
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const signed_tx = await signer.signTransaction(new_raw_tx);
  // checks whether the gas is failing
  const gas_estimation = await provider.estimateGas(signed_tx);
  // Creating a signing account from a private key
  const new_tx = await signer.sendTransaction(new_raw_tx);
  console.log("Mining transaction...");
  // Waiting for the transaction to be mined
  const new_receipt = await new_tx.wait();
  // The transaction is now on chain!
  console.log(
    `Mined transaction (see in its corresponding block explorer): ${new_receipt.transactionHash}`
  );
}

async function askForConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(yn(answer, { default: false }));
    });
  });
}

main();
