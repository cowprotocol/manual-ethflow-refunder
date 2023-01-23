# Manual refunder script

This script allows to manually refund a ethflow order;

### installation:

```
yarn
```

### execution

In order to inspect only the transaction to be refunded, you can run:

```
export INFURA_KEY=
export NETWORK=mainnet
export ETHFLOW_TX_HASH=
unset PRIVATE_KEY

node script/refunder.js
```

and for running the actual execution, one has to provide the private key:

```
export INFURA_KEY=
export NETWORK=mainnet
export ETHFLOW_TX_HASH=
export PRIVATE_KEY=

node script/refunder.js
```
