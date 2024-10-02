import { useCallback, useState } from "react";
import {
  type Hash,
  type Abi,
  encodeFunctionData,
  // parseUnits,
  formatUnits,
} from "viem";
import {
  useAccount,
  // useChains,
  useConfig,
  useWriteContract,
  // useReadContract,
} from "wagmi";
import {
  waitForTransactionReceipt,
  getGasPrice,
  estimateGas,
  readContract,
} from "@wagmi/core";

const withdrawDelegatorRewardAbi: Abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "delegatorAddress",
        type: "address",
      },
      {
        internalType: "string",
        name: "validatorAddress",
        type: "string",
      },
    ],
    name: "withdrawDelegatorRewards",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "denom",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct Coin[]",
        name: "amount",
        type: "tuple[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const withdrawAllDelegatorRewardsAbi: Abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "delegatorAddress",
        type: "address",
      },
      {
        internalType: "uint32",
        name: "maxRetrieve",
        type: "uint32",
      },
    ],
    name: "claimRewards",
    outputs: [
      {
        internalType: "bool",
        name: "success",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const delegationTotalRewardsAbi: Abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "delegatorAddress",
        type: "address",
      },
    ],
    name: "delegationTotalRewards",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "validatorAddress",
            type: "string",
          },
          {
            components: [
              {
                internalType: "string",
                name: "denom",
                type: "string",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
              {
                internalType: "uint8",
                name: "precision",
                type: "uint8",
              },
            ],
            internalType: "struct DecCoin[]",
            name: "reward",
            type: "tuple[]",
          },
        ],
        internalType: "struct DelegationDelegatorReward[]",
        name: "rewards",
        type: "tuple[]",
      },
      {
        components: [
          {
            internalType: "string",
            name: "denom",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "precision",
            type: "uint8",
          },
        ],
        internalType: "struct DecCoin[]",
        name: "total",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const delegationRewardsAbi: Abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "delegatorAddress",
        type: "address",
      },
      {
        internalType: "string",
        name: "validatorAddress",
        type: "string",
      },
    ],
    name: "delegationRewards",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "denom",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint8",
            name: "precision",
            type: "uint8",
          },
        ],
        internalType: "struct DecCoin[]",
        name: "rewards",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const DISTRIBUTION_PRECOMPILE_ADDRESS =
  "0x0000000000000000000000000000000000000801";

type Coin = { amount: bigint; denom: string; precision: number };

interface EstimatedFeeResponse {
  fee: string;
  gas_price: string;
  gas_used: string;
}

export function AllRewards() {
  const [rewards, setRewards] = useState<any>(undefined);
  const config = useConfig();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Convert Ethereum transaction hash to Cosmos SDK-like response
  const getEvmTransactionStatus = useCallback(
    async (hash: Hash) => {
      try {
        // Wait for the transaction to be mined
        const receipt = await waitForTransactionReceipt(config, { hash });

        // Check if the transaction was successful
        if (receipt.status === "success") {
          return {
            tx_response: {
              txhash: hash,
              code: 0, // Assuming 0 means success
              raw_log: "Transaction successful",
              // Add other fields as needed to match Cosmos SDK response structure
            },
          };
        } else {
          throw new Error("Transaction failed");
        }
      } catch (error) {
        console.error("Error getting EVM transaction status:", error);
        return null;
      }
    },
    [config]
  );

  // Get total rewards
  const handleGetTotalRewardsPrecompile = useCallback(async () => {
    if (!address || !config) {
      throw new Error("Insufficient data for total rewards");
    }

    try {
      const encodedData = encodeFunctionData({
        abi: delegationTotalRewardsAbi,
        functionName: "delegationTotalRewards",
        args: [address],
      });

      console.log("Encoded data:", encodedData);

      const totalRewards = await readContract(config, {
        address: DISTRIBUTION_PRECOMPILE_ADDRESS,
        abi: delegationTotalRewardsAbi,
        functionName: "delegationTotalRewards",
        args: [address],
      });

      console.log("Total rewards:", totalRewards);

      return totalRewards as [
        {
          validatorvalidatorAddress: string;
          reward: Coin;
        }[],
        Coin[]
      ];
    } catch (error) {
      console.error("Error getting total rewards:", error);
      throw error;
    }
  }, [address, config]);

  // Estimate fee for precompile claiming rewards from all validators
  const handlePrecompileClaimAllRewardsEstimatedFee = useCallback(
    async (maxRetrieve: bigint): Promise<EstimatedFeeResponse> => {
      if (!address || !config) {
        throw new Error("Insufficient data for fee estimation");
      }

      try {
        const encodedData = encodeFunctionData({
          abi: withdrawAllDelegatorRewardsAbi,
          functionName: "claimRewards",
          args: [address, maxRetrieve],
        });

        console.log("Encoded data:", encodedData);

        const estimatedGas = await estimateGas(config, {
          to: DISTRIBUTION_PRECOMPILE_ADDRESS,
          data: encodedData,
          account: address,
        });

        console.log("Estimated gas:", estimatedGas);

        const gasPrice = await getGasPrice(config);

        console.log("Gas price:", gasPrice);

        const fee = estimatedGas * gasPrice;

        return {
          fee: fee.toString(),
          gas_price: gasPrice.toString(),
          gas_used: estimatedGas.toString(),
        };
      } catch (error) {
        console.error("Error estimating gas:", error);
        throw error;
      }
    },
    [config, address]
  );

  // Handle precompile claiming rewards from all validators
  const handlePrecompileClaimAllRewards = useCallback(
    async (maxRetrieve: bigint) => {
      if (!address || !writeContractAsync) {
        throw new Error(
          "Insufficient data for claiming all rewards or simulation error"
        );
      }

      // Format maxRetrieve to remove decimals and convert back to bigint
      const formattedMaxRetrieve = BigInt(
        Math.floor(Number(formatUnits(maxRetrieve, 18)))
      );

      const txHash = await writeContractAsync({
        address: DISTRIBUTION_PRECOMPILE_ADDRESS,
        abi: withdrawAllDelegatorRewardsAbi,
        functionName: "claimRewards",
        args: [address, formattedMaxRetrieve],
      });

      if (!txHash) {
        throw new Error("Transaction was not sent");
      }

      const transactionStatus = await getEvmTransactionStatus(txHash);

      if (transactionStatus === null) {
        throw new Error("Transaction not found");
      }

      return transactionStatus.tx_response;
    },
    [address, writeContractAsync, getEvmTransactionStatus]
  );

  return (
    <div>
      <h2>All Rewards</h2>

      <button
        onClick={async () => {
          const rewardsFromPrecompile = await handleGetTotalRewardsPrecompile();
          setRewards(rewardsFromPrecompile);
        }}
      >
        Get rewards amount
      </button>
      <p>
        Rewards:{" "}
        {rewards
          ? formatUnits(rewards[1][0].amount, rewards[1][0].precision)
          : "press get rewards button"}
      </p>

      {rewards && (
        <>
          <h3>Claim all rewards</h3>
          <button
            disabled={!rewards}
            onClick={async () => {
              if (rewards) {
                // Format maxRetrieve here as well
                const formattedMaxRetrieve = BigInt(
                  Math.floor(
                    Number(
                      formatUnits(rewards[1][0].amount, rewards[1][0].precision)
                    )
                  )
                );
                const fee = await handlePrecompileClaimAllRewardsEstimatedFee(
                  formattedMaxRetrieve
                );
                console.log({ fee });
              }
            }}
          >
            Get estimated fee for claim all rewards
          </button>
          <button
            disabled={!rewards}
            onClick={async () => {
              if (rewards) {
                const tx = await handlePrecompileClaimAllRewards(
                  rewards[1][0].amount
                );
                console.log({ tx });
              }
            }}
          >
            Claim all rewards
          </button>
        </>
      )}
    </div>
  );
}

export function RewardsFromValidator() {
  const [validatorAddress, setValidatorAddress] = useState<string>("");
  const [rewards, setRewards] = useState<any>(undefined);
  const config = useConfig();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Convert Ethereum transaction hash to Cosmos SDK-like response
  const getEvmTransactionStatus = useCallback(
    async (hash: Hash) => {
      try {
        // Wait for the transaction to be mined
        const receipt = await waitForTransactionReceipt(config, { hash });

        // Check if the transaction was successful
        if (receipt.status === "success") {
          return {
            tx_response: {
              txhash: hash,
              code: 0, // Assuming 0 means success
              raw_log: "Transaction successful",
              // Add other fields as needed to match Cosmos SDK response structure
            },
          };
        } else {
          throw new Error("Transaction failed");
        }
      } catch (error) {
        console.error("Error getting EVM transaction status:", error);
        return null;
      }
    },
    [config]
  );

  // Estimate fee for precompile claiming rewards from a single validator
  const handlePrecompileClaimRewardEstimatedFee = useCallback(
    async (validatorAddress: string): Promise<EstimatedFeeResponse> => {
      if (!address || !config) {
        throw new Error("Insufficient data for fee estimation");
      }

      try {
        const encodedData = encodeFunctionData({
          abi: withdrawDelegatorRewardAbi,
          functionName: "withdrawDelegatorRewards",
          args: [address, validatorAddress],
        });

        console.log("Encoded data:", encodedData);

        const estimatedGas = await estimateGas(config, {
          to: DISTRIBUTION_PRECOMPILE_ADDRESS,
          data: encodedData,
          account: address,
        });

        console.log("Estimated gas:", estimatedGas);

        const gasPrice = await getGasPrice(config);

        console.log("Gas price:", gasPrice);

        const fee = estimatedGas * gasPrice;

        return {
          fee: fee.toString(),
          gas_price: gasPrice.toString(),
          gas_used: estimatedGas.toString(),
        };
      } catch (error) {
        console.error("Error estimating gas:", error);
        throw error;
      }
    },
    [config, address]
  );

  // Handle precompile claiming reward from a single validator
  const handlePrecompileClaimReward = useCallback(
    async (validatorAddress: string) => {
      if (!address || !writeContractAsync) {
        throw new Error(
          "Insufficient data for claiming reward or simulation error"
        );
      }

      const txHash = await writeContractAsync({
        address: DISTRIBUTION_PRECOMPILE_ADDRESS,
        abi: withdrawDelegatorRewardAbi,
        functionName: "withdrawDelegatorRewards",
        args: [address, validatorAddress],
      });

      if (!txHash) {
        throw new Error("Transaction was not sent");
      }

      const transactionStatus = await getEvmTransactionStatus(txHash);

      if (transactionStatus === null) {
        throw new Error("Transaction not found");
      }

      return transactionStatus.tx_response;
    },
    [address, writeContractAsync, getEvmTransactionStatus]
  );

  // Function to check for rewards
  const checkRewards = useCallback(async () => {
    if (!address || !config || !validatorAddress) {
      throw new Error("Insufficient data to check rewards");
    }

    try {
      const rewardsData = await readContract(config, {
        address: DISTRIBUTION_PRECOMPILE_ADDRESS,
        abi: delegationRewardsAbi,
        functionName: "delegationRewards",
        args: [address, validatorAddress],
      });

      console.log("Rewards data:", rewardsData);
      setRewards(rewardsData);
      return rewardsData;
    } catch (error) {
      console.error("Error checking rewards:", error);
      throw error;
    }
  }, [address, config, validatorAddress]);

  return (
    <div>
      <h2>Rewards from Validator</h2>
      <input
        placeholder="Validator Address"
        value={validatorAddress}
        onChange={(event) => {
          setValidatorAddress(event.currentTarget.value);
        }}
      />
      <button onClick={checkRewards} disabled={!validatorAddress}>
        Check Rewards
      </button>

      <p>
        Available rewards:{" "}
        {rewards && rewards.length > 0
          ? formatUnits(rewards[0].amount, rewards[0].precision)
          : "enter validator address and press check rewards button"}
      </p>

      {rewards && (
        <>
          <h3>Claim rewards</h3>
          <button
            onClick={async () => {
              if (validatorAddress) {
                const fee = await handlePrecompileClaimRewardEstimatedFee(
                  validatorAddress
                );
                console.log({ fee });
              }
            }}
          >
            Get estimated fee for claim rewards
          </button>
          <button
            onClick={async () => {
              if (validatorAddress) {
                const tx = await handlePrecompileClaimReward(validatorAddress);
                console.log({ tx });
              }
            }}
            disabled={!validatorAddress}
          >
            Claim Rewards
          </button>
        </>
      )}
    </div>
  );
}
