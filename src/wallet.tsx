import { useCallback, useMemo } from "react";
import {
  useAccount,
  useChains,
  useConnect,
  useConnectors,
  useDisconnect,
} from "wagmi";

export function WalletConnection() {
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const availableConnectors = useConnectors();
  const { address, chain } = useAccount();
  const availableChains = useChains();

  console.log({ address, chain, availableChains });

  const handleConnect = useCallback(
    async (connectorId: number) => {
      return await connectAsync({
        connector: availableConnectors[connectorId],
      });
    },
    [availableConnectors, connectAsync]
  );

  const connectors = useMemo(() => {
    return availableConnectors.map((connector, index) => {
      return {
        id: index,
        name: connector.name,
      };
    });
  }, [availableConnectors]);

  const handleDisconnect = async () => {
    await disconnectAsync();
  };

  return (
    <div>
      <h2>Wallet</h2>

      {!address &&
        connectors.map((connector, index) => {
          return (
            <button
              key={`connector-${index}`}
              onClick={async () => {
                await handleConnect(connector.id);
              }}
            >
              Connect {connector.name}
            </button>
          );
        })}
      {address && (
        <>
          <button onClick={handleDisconnect}>Disconnect</button>
          <p>Address: {address}</p>
          <p>Chain: {chain?.name}</p>
        </>
      )}
    </div>
  );
}
