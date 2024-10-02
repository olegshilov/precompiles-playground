import { WalletConnection } from "./wallet";
import { AllRewards, RewardsFromValidator } from "./rewards";

export default function App() {
  return (
    <div>
      <h1>Precompile test</h1>
      <WalletConnection />
      <hr />
      <AllRewards />
      <hr />
      <RewardsFromValidator />
    </div>
  );
}
