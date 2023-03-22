import { ethers } from "./lib/ethers.js";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

function handleError(inner) {
  return () =>
    Promise.resolve(inner()).catch((err) => {
      console.error(err);
      alert(err.message);
    });
}

function ethflowContract(address) {
  const ORDER_TYPE = `(
    address buyToken,
    address receiver,
    uint256 sellAmount,
    uint256 buyAmount,
    bytes32 appData,
    uint256 feeAmount,
    uint32 validTo,
    bool partiallyFillable,
    int64 quoteId
  )`;

  return new ethers.Contract(
    address,
    [
      `function createOrder(${ORDER_TYPE} order) payable returns (bytes32)`,
      `function invalidateOrder(${ORDER_TYPE} order)`,
    ],
    signer,
  );
}

async function readTransaction() {
  const hash = document.querySelector("#transactionHash").value;
  const tx = await provider.getTransaction(hash);
  if (tx == null) {
    throw new Error(`cannot find transaction ${hash}`);
  }

  return tx;
}

document.querySelector("#execute").addEventListener(
  "click",
  handleError(async () => {
    await ethereum.request({ method: "eth_requestAccounts" });

    const creation = await readTransaction();
    const ethflow = ethflowContract(creation.to);
    const [order] = ethflow.interface.decodeFunctionData(
      "createOrder",
      creation.data,
    );

    await ethflow.invalidateOrder(order);
  }),
);

const TENDERLY = "https://dashboard.tenderly.co/gp-v2/alerts";

document.querySelector("#simulate").addEventListener(
  "click",
  handleError(async () => {
    await ethereum.request({ method: "eth_requestAccounts" });

    const creation = await readTransaction();
    const ethflow = ethflowContract(creation.to);
    const [order] = ethflow.interface.decodeFunctionData(
      "createOrder",
      creation.data,
    );

    const { chainId } = await provider.getNetwork();
    const calldata = ethflow.interface
      .encodeFunctionData("invalidateOrder", [order]);
    const simulation = `${TENDERLY}/simulator/new` +
      `?contractAddress=${ethflow.address}` +
      `&network=${chainId}` +
      `&rawFunctionInput=${calldata}`;

    window.open(simulation, "_blank");
  }),
);
