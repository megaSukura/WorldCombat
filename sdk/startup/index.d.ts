/** KubeJS registry events run in startup scripts, before server/client content is loaded. */
declare const StartupEvents: {
    registry(registry: "mob_effect", callback: (event: { create(id: string): StartupMobEffectBuilder }) => void): void;
    registry(registry: string, callback: (event: { create(id: string, type?: string): any }) => void): void;
};
/**
 * KubeJS 2101.7.2 MobEffectBuilder; create native instances during startup, react in server content.
 * `create(id)` takes `namespace:path`, or a bare path that uses the `kubejs` namespace. Ids follow
 * vanilla ResourceLocation rules: namespace `[a-z0-9_.-]`, path `[a-z0-9_./-]`.
 */
interface StartupMobEffectBuilder {
    /** Set the display component directly; without it the native name resolves from the `effect.<namespace>.<path>` language key. */
    displayName(name: string): this;
    /** Mark the effect beneficial (MobEffectCategory.BENEFICIAL); the constructor default is neutral. */
    beneficial(): this;
    /** Mark the effect harmful (MobEffectCategory.HARMFUL). */
    harmful(): this;
    /** Choose the category explicitly; `"neutral"` matches the constructor default. */
    category(category: "beneficial" | "harmful" | "neutral"): this;
    /** Set the icon and particle tint: `0xRRGGBB`, `"#RRGGBB"`, or a named KubeJS color (default `0xFFFFFF`). */
    color(value: number | string): this;
    /** Add a native attribute modifier while the effect is active; `attribute` is an attribute id, `modifier` a unique modifier id, `amount` its value, `operation` the vanilla operation name. */
    modifyAttribute(attribute: string, modifier: string, amount: number,
        operation: "add_value" | "add_multiplied_base" | "add_multiplied_total"): this;
    /** Run on every native effect tick; `entity` is the affected living entity, `amplifier` its current amplifier. */
    effectTick(callback: (entity: any, amplifier: number) => void): this;
    /** Mark the effect instantaneous; its effectTick callback becomes the single application effect. */
    instant(): this;
    /** Enable or disable instantaneous behavior. */
    instant(enabled: boolean): this;
    /** Override the key used by KubeJS-generated language files; the native effect name still uses `effect.<namespace>.<path>`. */
    translationKey(key: string): this;
    /** Attach one native tag to the registered effect (one call per tag: .tag("a").tag("b")). */
    tag(tag: string): this;
}
declare const Java: { loadClass(name: string): any };
declare const Platform: { isLoaded(modId: string): boolean };
