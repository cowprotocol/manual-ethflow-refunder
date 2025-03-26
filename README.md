# Manual refunder script

This script allows to manually refund a ethflow order;

### installation:
_**Note: this step is not required if you are running from a devcontainer**_

```
yarn install --frozen-lockfile
```

### execution

In order to inspect only the transaction to be refunded, you can run(error is expected in the output):

You can find the node URL in https://chainlist.org/
When running a local RPC node and running the script for a devcontainer, use `host.docker.internal` host instead of `localhost`.

```
export NODE_URL=
export ETHFLOW_TX_HASH=
unset PRIVATE_KEY

node script/refunder.js
```

and for running the actual execution, one has to provide the private key:

```
export NODE_URL=
export ETHFLOW_TX_HASH=
export PRIVATE_KEY=

node script/refunder.js
```

If the order is already refunded, the script will fail with a gas estimation error due to the execution revert.

In case of gas estimation or any other node-related issue, use `NODE_URL` env variable to point to a different node(e.g. `rpc.mevblocker.io`).
