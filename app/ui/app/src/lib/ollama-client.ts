import { OWN } from "own/browser";
import { OLLAMA_HOST } from "./config";

let _ownClient: OWN | null = null;

export const ownClient = new Proxy({} as OWN, {
  get(_target, prop) {
    if (!_ownClient) {
      _ownClient = new OWN({
        host: OLLAMA_HOST,
      });
    }
    const value = _ownClient[prop as keyof OWN];
    return typeof value === "function" ? value.bind(_ownClient) : value;
  },
});
