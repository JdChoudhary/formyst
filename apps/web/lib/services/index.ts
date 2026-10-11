import { sendFormNotification } from "./notifications";

export { sendFormNotification };
export type { FormNotificationInput } from "./notifications";

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price?: number;
  [key: string]: unknown;
}

/**
 * Minimal service client. The marketing pricing surface was wired to an
 * external product catalogue that is no longer part of the stack; this keeps
 * the call shape stable and returns an empty catalogue rather than crashing.
 */
export const api = {
  products: {
    async list(_params?: { isArchived?: boolean }): Promise<{
      result: { items: Product[] };
    }> {
      return { result: { items: [] } };
    },
  },
};
