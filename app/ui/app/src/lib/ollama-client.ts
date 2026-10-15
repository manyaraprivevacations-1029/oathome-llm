import { Ollama } from "ollama/browser";
import { OLLAMA_HOST } from "./config";

let _ownClient: Ollama | null = null;

export const ownClient = new Proxy({} as Ollama, {
  get(_target, prop) {
    if (!_ownClient) {
      _ownClient = new Ollama({
        host: OLLAMA_HOST,
      });
    }
    const value = _ownClient[prop as keyof Ollama];
    return typeof value === "function" ? value.bind(_ownClient) : value;
  },
});
