const ethers = require("ethers");
const ABI = require("../abi/ethflow.json");
require("dotenv").config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.NODE_URL,
  );
  const tx_hash =
    process.env.ETHFLOW_TX_HASH ||
    "0x1416bc69abce952dc42578ea5bbeacd6dbbf15130d30d6305a686a2fb5a6690f";
  const tx = await provider.getTransaction(tx_hash);
  const receipt = await tx.wait();
  const iface = new ethers.utils.Interface(ABI);
  const log = receipt.logs[0];
  const ethflow_address = ethers.utils.getAddress(log.address);
  const order = iface.parseLog(log).args.order;
  console.log(
    `trying to invalidate the following order on eth-flow contract at ${ethflow_address}:`,
    order
  );

  if (receipt.to.toLowerCase() !== ethflow_address.toLowerCase()) {
    throw new Error(
      "The eth-flow refunder script only works for direct interactions with the eth-flow contract. Refunds from complex transactions must be handled manually"
    );
  }

  // Creating and sending the transaction object
  const new_raw_tx = {
    to: ethflow_address,
    // we reuse the same data from original tx, as this contains the correct ethflow order
    // we only exchange the signature from createOrder to invalidateOrder
    data: "0x7bc41b96".concat(tx.data.substring(10)).toString(),
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
  console.log(`Mined transaction (see in its corresponding block explorer): ${new_receipt.transactionHash}`);
}

main();
