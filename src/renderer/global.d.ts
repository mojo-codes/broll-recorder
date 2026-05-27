import type { BrollApi } from "../shared/types";

declare global {
  interface Window {
    broll: BrollApi;
  }
}

export {};
