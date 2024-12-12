# Manual refunder script

This script allows to manually refund a ethflow order;

### installation:

```
yarn
```

### execution

In order to inspect only the transaction to be refunded, you can run(error is expected in the output):

You can find the node URL in https://chainlist.org/

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

In case of gas estimation or any other node-related issue, use `NODE_URL` env variable to point to a different node(e.g. `rpc.mevblocker.io`).
