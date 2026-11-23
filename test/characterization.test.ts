import { describe, it, expect } from "vitest";
import { defu, defuFn } from "../src/defu";

describe("characterization tests for critical path (defu golden master)", () => {
  // CHARACTERIZATION: preserving legacy bug/quirk: explicit `undefined` in source does not clear or overwrite default value
  it("should keep default value when source explicitly provides undefined", () => {
    const source = { timeout: undefined, retries: 3 };
    const defaults = { timeout: 5000, retries: 1 };
    const result = defu(source, defaults);
    expect(result).toEqual({ timeout: 5000, retries: 3 });
  });

  // CHARACTERIZATION: preserving legacy bug/quirk: Object.keys() omits Symbol properties, so source symbols never override defaults
  it("should silently drop Symbol keys from source objects during merge", () => {
    const sym = Symbol("internalKey");
    const source = { [sym]: "source_val", name: "app" };
    const defaults = { [sym]: "default_val", name: "default_app" };
    const result = defu(source as any, defaults as any) as any;
    expect(result.name).toBe("app");
    // Symbol from defaults is cloned via { ...defaults }, but source symbol was skipped
    expect(result[sym]).toBe("default_val");
  });

  it("should allow falsy non-nullish primitives to overwrite defaults", () => {
    const source = { emptyStr: "", zero: 0, flag: false };
    const defaults = { emptyStr: "fallback", zero: 100, flag: true };
    const result = defu(source, defaults);
    expect(result.emptyStr).toBe("");
    expect(result.zero).toBe(0);
    expect(result.flag).toBe(false);
  });

  it("should concatenate multi-level arrays preserving left-to-right argument precedence without deduplication", () => {
    const result = defu(
      { tags: ["alpha", "beta"] },
      { tags: ["beta", "gamma"] },
      { tags: ["delta"] }
    );
    expect(result.tags).toEqual(["alpha", "beta", "beta", "gamma", "delta"]);
  });

  it("should overwrite default object with primitive if source property is non-object", () => {
    const source = { config: "disabled" };
    const defaults = { config: { enabled: true, mode: "fast" } };
    const result = defu(source as any, defaults as any);
    expect(result).toEqual({ config: "disabled" });
  });

  it("should ignore __proto__ and constructor properties in deeply nested sources", () => {
    const payload = JSON.parse(
      '{"nested": {"__proto__": {"polluted": true}, "constructor": {"evil": true}, "safe": 42}}'
    );
    const defaults = { nested: { safe: 0 } };
    const result = defu(payload, defaults);

    expect(result.nested.safe).toBe(42);
    expect((result as any).polluted).toBeUndefined();
    expect(({} as any).polluted).toBeUndefined();
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it("should retain standard merge when defuFn receives a non-function value", () => {
    const source = { count: 10, name: "custom" };
    const defaults = { count: 5, name: "default" };
    const result = defuFn(source, defaults);
    expect(result).toEqual({ count: 10, name: "custom" });
  });
});
