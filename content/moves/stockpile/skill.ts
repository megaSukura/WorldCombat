/** Store up to three independently owned layers; shared stockpile identity is the consumer contract. */
namespace PokemonSkills {
    const stockpileScene = "world_combat:move_stockpile";
    const stockpileCharge = "world_combat:stockpile_charge";
    const stockpileMark = "world_combat:stockpile_mark";
    const stockpileStoreText = "world_combat.move.stockpile.text.store";
    const stockpileCrackText = "world_combat.move.stockpile.text.crack";
    const stockpileScatterText = "world_combat.move.stockpile.text.scatter";
    export const stockpileMaxLayers = 3;
    interface StockpileLayer { window: number; until: number; }
    interface StockpileState { layers: StockpileLayer[]; request: any; carrier?: MobEffects.Anchor; }
    function stockpileView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, stockpileMark);
        for (let i = 0; i < views.length; i++) {
            const state: StockpileState = JSON.parse(views[i].data());
            if (state.carrier && MobEffects.matches(world, actor, state.carrier)) return views[i];
        }
        return null;
    }
    export function stockpileLayers(world: CombatWorld, actor: CombatActor): number {
        const value = CombatStatus.representative(world, actor, "stockpile");
        return value ? Math.max(0, Math.min(3, value.amplifier())) : 0;
    }
    WorldCombat.effect(stockpileMark, 2, 1200, "actor", json => {
        const value = JSON.parse(json);
        if (!Array.isArray(value.layers) || value.layers.length > 3 || !value.request
            || value.layers.some((layer: StockpileLayer) => !isFinite(layer.window) || !isFinite(layer.until))
            || value.carrier && !MobEffects.validAnchor(value.carrier)) throw new Error("Invalid stockpile store");
        return JSON.stringify(value);
    }, () => { throw new Error("Stockpile ownership changed"); });
    function stockpileVisual(effect: CombatEffect, state: StockpileState): void {
        const world = effect.world(), body = world.observe(effect.target());
        if (!body) return;
        world.present("world_combat:stockpile/store", stockpileScene, 1, body.position(), JSON.stringify({
            moment: "guard", target: String(effect.target().ref()), layers: state.layers.length,
            orb2: state.layers.length >= 2 ? 3 : 0, orb3: state.layers.length >= 3 ? 3 : 0,
            rind: state.request.rind, shellSize: 0.16 + state.layers.length * 0.07, scale: state.request.rind / 1.2
        }));
    }
    /** Exact counter update; a refused removal keeps the old store, a refused replacement closes its owned windows. */
    function stockpileCounter(effect: CombatEffect, state: StockpileState): boolean {
        const world = effect.world(), actor = effect.target(), now = world.tick();
        if (state.carrier && !MobEffects.matches(world, actor, state.carrier)) { effect.end(); return false; }
        if (!state.layers.length) { effect.end(); return false; }
        const ticks = Math.max(1, Math.max.apply(null, state.layers.map(layer => layer.until)) - now);
        if (state.carrier && !world.removeMobEffect(actor, state.carrier.id, state.carrier.key)) return false;
        const carrier = MobEffects.apply(world, actor, stockpileCharge, ticks, state.layers.length);
        if (!carrier || carrier.amplifier() !== state.layers.length) { effect.end(); return false; }
        state.carrier = MobEffects.anchor(carrier); effect.state(JSON.stringify(state)); effect.remaining(ticks);
        MobEffects.bind(world, actor, carrier.id(), carrier);
        stockpileVisual(effect, state); return true;
    }
    function stockpileUse(effect: CombatEffect, request: any): boolean {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        const state: StockpileState = JSON.parse(effect.state());
        if (!body || state.carrier && !MobEffects.matches(world, actor, state.carrier)) { effect.end(); return false; }
        state.request = request;
        if (state.layers.length >= stockpileMaxLayers) {
            const spent = state.layers[0]; state.layers = state.layers.slice(1);
            if (!stockpileCounter(effect, state)) return false;
            if (spent.window) NativeEffects.windowClose(world, spent.window);
            if (request.mode === "burst") {
                const reach = Math.max(1.5, body.width() / 2 + request.rind);
                world.query(body.position(), reach, true).forEach(victim => {
                    if (world.friendly(victim) || String(victim.key()) === String(actor.key())) return;
                    const at = world.observe(victim); if (!at || !world.clear(body.position(), at.position())) return;
                    const away = at.position().minus(body.position());
                    if (away.length() > 0.01) world.hitDisplace(victim, away.unit().scale(Math.min(4, request.shove)));
                });
            } else heal(world, actor, request.mend, "stockpile");
            WorldFeedback.emit(world, stockpileScene, 1, body.position(), { moment: "crack", target: String(actor.ref()),
                layers: state.layers.length, layer: 1, scale: request.rind / 1.2 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), stockpileCrackText, [state.layers.length], 22);
            world.sound("minecraft:block.amethyst_block.hit", body.position(), 12, "{}");
        } else {
            state.layers.push({ window: 0, until: world.tick() + request.ticks });
            if (!stockpileCounter(effect, state)) return false;
            let window = NativeEffects.boostWindow(world, actor, { def: request.guard, spd: request.ward }, request.ticks, "stockpile", undefined, null);
            if (window && !world.operation(window, "world_combat:stage_owner", JSON.stringify({ actor: String(actor.ref()), definition: stockpileMark, id: effect.id() }))) {
                NativeEffects.windowClose(world, window); window = 0;
            }
            state.layers[state.layers.length - 1].window = window; effect.state(JSON.stringify(state));
            WorldFeedback.emit(world, stockpileScene, 1, body.position(), { moment: "store", target: String(actor.ref()),
                layers: state.layers.length, layer: state.layers.length, charge: request.charge, rind: request.rind,
                scale: request.rind / 1.2, shellSize: 0.16 + state.layers.length * 0.07 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), stockpileStoreText, [state.layers.length], 28);
            world.sound("minecraft:item.crossbow.loading_start", body.position(), 14, "{}");
        }
        return true;
    }
    WorldCombat.effectHandler(stockpileMark, "start", effect => {
        if (stockpileUse(effect, JSON.parse(effect.state()).request)) effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(stockpileMark, "operation:world_combat:stockpile/use", effect => {
        if (String(effect.caller().key()) !== String(effect.target().key())) { effect.reject("not-owner"); return; }
        stockpileUse(effect, JSON.parse(effect.input()));
    });
    WorldCombat.effectHandler(stockpileMark, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(stockpileMark, "watch", effect => {
        const state: StockpileState = JSON.parse(effect.state()), world = effect.world();
        if (!state.carrier || !MobEffects.matches(world, effect.target(), state.carrier)) { effect.end(); return; }
        const elapsed = state.layers.filter(layer => layer.until <= world.tick());
        if (elapsed.length) {
            state.layers = state.layers.filter(layer => layer.until > world.tick());
            if (!stockpileCounter(effect, state)) return;
            elapsed.forEach(layer => { if (layer.window) NativeEffects.windowClose(world, layer.window); });
        }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(stockpileMark, "end", effect => {
        const world = effect.world(), state: StockpileState = JSON.parse(effect.state());
        state.layers.forEach(layer => { if (layer.window) NativeEffects.windowClose(world, layer.window); });
        const body = world.observe(effect.target()); if (!body) return;
        WorldFeedback.emit(world, stockpileScene, 1, body.position(), { moment: "scatter", target: String(effect.target().ref()), layers: state.layers.length }, 22);
        if (state.layers.length) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), stockpileScatterText, [state.layers.length], 22);
    });

    define({
        id: "stockpile",
        cooldownParameter: "wait",
        name: "蓄力",
        description: "积蓄最多三口气，每层提供独立的防御与特防加成，留给喷出或吞下。满层再使用时主动放出一层，按偏好回气治疗或震开近敌；层数到期或消费时只收回自己的防护。",
        uses: ["积蓄双防，留给喷出或吞下", "满层时主动放一口气回血", "满层震开贴身敌人，留住另外两层"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 5,
        active: 1,
        recover: 4,
        cooldown: 50,
        style: "hoard",
        stationary: true,
        defaults: { break: "mend", ai: { maxChase: 12, minGap: 2, hoardTo: 2 } },
        fields: [
            field(pathOf("break"), "满层释气", "choice", {
                options: [
                    { value: "mend", label: "回气" },
                    { value: "burst", label: "震开" }
                ],
                help: "满三层再使用时消费一层：回气恢复少量生命，震开把周围可见近敌推离。喷出和吞下仍可一次消费全部积蓄。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("stockpile", "rind", pokemon), geometry: "area", style: "hoard", color: 0xF0B23A,
                label: config && String(config.break) === "burst" ? "蓄力 · 震开" : "蓄力 · 回气" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["stockpile"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("stockpile", "tempo", context)),
                recover: Math.round(p("stockpile", "aftercast", context)),
                cooldown: Math.round(p("stockpile", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            const full = stockpileLayers(action.sense(), action.actor()) >= stockpileMaxLayers;
            if (full) action.present("world_combat:stockpile/purpose", "world_combat:feedback", 1, action.origin(), JSON.stringify({
                kind: "world-text", start: action.sense().tick(), duration: prepare + 8, key: "world_combat.move.stockpile.text.release", args: []
            }));
            action.present("world_combat:move_stockpile:gather", stockpileScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", mode: config && String(config.break) === "burst" ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor();
            const request = {
                mode: config && String(config.break) === "burst" ? "burst" : "mend",
                ticks: Math.max(60, Math.round(p("stockpile", "bond", action))),
                rind: Math.max(0.5, p("stockpile", "rind", action)),
                charge: Math.max(8, Math.round(p("stockpile", "charge", action))),
                shove: Math.max(0.5, p("stockpile", "shove", action)),
                mend: Math.max(0, p("stockpile", "mend", action)),
                guard: p("stockpile", "guard", action), ward: p("stockpile", "ward", action)
            };
            const view = stockpileView(world, actor);
            if (view) world.operation(view.id(), "world_combat:stockpile/use", JSON.stringify(request));
            else world.effect(stockpileMark, actor, JSON.stringify({ layers: [], request: request }), request.ticks);
            done(action);
        }
    });
}
