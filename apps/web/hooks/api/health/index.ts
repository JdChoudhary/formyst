import { trpc } from "~/trpc/client";

export const useHealth = () => {
  return trpc.health.getHealth.useQuery();
};
