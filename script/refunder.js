const ethers = require("ethers");
const ABI = require("../abi/ethflow.json");
require("dotenv").config();

async function main() {
  const ethflow_address = "0x40a50cf069e992aa4536211b23f286ef88752187"; ///ethflow Contract
  const network = process.env.NETWORK | "mainnet";
  const provider = new ethers.providers.InfuraProvider(
    network,
    process.env.INFURA_KEY
  );
  const contract = new ethers.Contract(ethflow_address, ABI, provider);
  const tx_hash =
    process.env.ETHFLOW_TX_HASH |
    "0x1416bc69abce952dc42578ea5bbeacd6dbbf15130d30d6305a686a2fb5a6690f";
  const tx = await provider.getTransaction(tx_hash);
  const receipt = await tx.wait();
  const iface = new ethers.utils.Interface(ABI);
  const order = iface.parseLog(receipt.logs[0]).args.order;
  console.log("trying to invalidate the following order:", order);

  // Creating and sending the transaction object
  const new_raw_tx = {
    to: ethflow_address,
    data: tx.data, // we reuse the same data from original tx, as this contains the correct ethflow order
    value: ethers.utils.parseUnits("0", "ether"),
  };
  // checks whether the gas is failing
  const gas_estimation = await provider.estimateGas(new_raw_tx);
  // Creating a signing account from a private key
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const new_tx = await signer.sendTransaction(new_raw_tx);
  console.log("Mining transaction...");
  console.log(`https://${network}.etherscan.io/tx/${tx.hash}`);
  // Waiting for the transaction to be mined
  const new_receipt = await tx.wait();
  // The transaction is now on chain!
  console.log(`Mined in block ${receipt.blockNumber}`);
}

main();
