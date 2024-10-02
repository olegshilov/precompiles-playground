import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { createConfig, http, WagmiProvider } from "wagmi";
import { haqqMainnet, haqqTestedge2 } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const wagmiConfig = createConfig({
  chains: [haqqMainnet, haqqTestedge2],
  transports: {
    [haqqMainnet.id]: http(),
    [haqqTestedge2.id]: http(),
  },
  multiInjectedProviderDiscovery: true,
});
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retryDelay: (attemptIndex: number) => {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      staleTime: 30000,
      refetchInterval: 60000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
