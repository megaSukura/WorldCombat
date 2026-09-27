/** 暂时平衡双方的实际护甲与护甲韧性：较厚的一方降低、较薄的一方提高，两边用同一套世界护甲单位。 */
namespace PokemonSkills {
    export const guardsplitScene = "world_combat:move_guardsplit";
    export const guardsplitWindow = "world_combat:guardsplit_window";
    export const guardsplitHum = "world_combat:guardsplit_hum";
    export const guardsplitArmor = "minecraft:generic.armor";
    export const guardsplitToughness = "minecraft:generic.armor_toughness";
    export const guardsplitSource = "world_combat:guardsplit";
    export const guardsplitLevelText = "world_combat.move.guardsplit.text.leveled";
    export const guardsplitFlatText = "world_combat.move.guardsplit.text.flat";
    export const guardsplitBackText = "world_combat.move.guardsplit.text.reverted";
    export const guardsplitMissText = "world_combat.move.guardsplit.text.miss";
    export const guardsplitNoneText = "world_combat.move.guardsplit.text.none";

    // 平分窗口期间的持续表现：真正的托管效果拥有它，随窗口一起结束，不留视觉残留。
    WorldCombat.effect(guardsplitHum, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.pair !== "string") throw new Error("Invalid guard split hum");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(guardsplitHum, "start", function (effect) {
        const world = effect.world(), actor = effect.target();
        const body = world.valid(actor) ? world.observe(actor) : null;
        if (body === null) return;
        const value = JSON.parse(String(effect.state()));
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_guardsplit/hum", guardsplitScene, 1, body.position(),
            { moment: "hum", target: String(actor.ref()), pair: value.pair, motes: 6, remaining: effect.remaining() });
    });
    WorldCombat.effectHandler(guardsplitHum, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 一位战斗者当前的实际世界防护合计（护甲 + 护甲韧性），供本招 AI 按同一单位比较。 */
    export function guardsplitGuard(world: CombatWorld, actor: CombatActor): number {
        const values = CombatCopies.read(world, actor, [guardsplitArmor, guardsplitToughness]);
        return (values[guardsplitArmor] || 0) + (values[guardsplitToughness] || 0);
    }

    define({
        id: "guardsplit",
        cooldownParameter: "recharge",
        name: "防守平分",
        description: "暂时把双方的实际护甲与护甲韧性拉到同一水平：较高的一方降低、较低的一方提高，两边共用同一套世界护甲单位。宝可梦的原生防御/特防与能力等级保持原样；只作用于经过原生护甲计算的攻击，显式无视护甲的伤害照常绕过。敌人和伙伴都可选。",
        uses: ["把自己的薄甲抬到对手的厚度", "把对手的厚甲削到自己的水平", "把自己的厚甲分给需要护甲的伙伴"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 10,
        active: 1,
        recover: 6,
        cooldown: 95,
        style: "split",
        stationary: true,
        defaults: { ai: { maxChase: 12, edge: 1.15, leaveStation: false, share: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["guardsplit"], detail: { values: config } };
            return { radius: p("guardsplit", "reach", context), geometry: "line", style: "split", color: 0x70C8C0, label: "防守平分" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["guardsplit"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("guardsplit", "tempo", context)),
                recover: Math.round(p("guardsplit", "aftercast", context)),
                cooldown: Math.round(p("guardsplit", "recharge", context)),
                active: 1,
                range: p("guardsplit", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, actor, "guardsplit") || CombatStatus.has(world, target, "guardsplit")) return "already-split";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("guardsplit", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:guardsplit:" + action.id(), guardsplitScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", target: action.target() === null ? "" : String(action.target()!.ref()),
                    path: [String(action.actor().ref()), action.target() === null ? String(action.actor().ref()) : String(action.target()!.ref())],
                    motes: Math.max(1, Math.round(p("guardsplit", "motes", action))) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) {
                WorldFeedback.emit(world, guardsplitScene, 1, body.position(), { moment: "fizzle" }, 16);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), guardsplitMissText, [], 22);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { done(action); return; }
            const window = Math.max(100, Math.round(p("guardsplit", "span", action)));
            const motes = Math.max(1, Math.round(p("guardsplit", "motes", action)));
            const scale = (body.width() + body.height()) / 2.3;
            const dims = [guardsplitArmor, guardsplitToughness];
            // 两端各读一次同一套世界护甲事实；只有双方都存在的维度才参与平分。
            const mine = CombatCopies.read(world, actor, dims), theirs = CombatCopies.read(world, target, dims);
            const shared: CombatCopies.Values = {};
            dims.forEach(function (id) {
                if (mine[id] !== undefined && theirs[id] !== undefined) shared[id] = (mine[id] + theirs[id]) / 2;
            });
            const mineTotal = (mine[guardsplitArmor] || 0) + (mine[guardsplitToughness] || 0);
            const theirTotal = (theirs[guardsplitArmor] || 0) + (theirs[guardsplitToughness] || 0);
            const gap = Math.abs(theirTotal - mineTotal);
            const reference = Math.max(1, Math.max(mineTotal, theirTotal));
            const gauge = Math.max(0, Math.min(1, gap / reference));
            const flow = Math.max(4, Math.min(96, Math.round(motes * (0.4 + gauge * 1.6))));
            const total = Math.max(1, mineTotal + theirTotal);
            const selfShare = mineTotal / total, foeShare = 1 - selfShare;
            const selfFlow = Math.max(2, Math.round(flow * selfShare * 1.5));
            const foeFlow = Math.max(2, Math.round(flow * foeShare * 1.5));
            const selfSize = Math.round((0.1 + 0.24 * selfShare) * 100) / 100;
            const foeSize = Math.round((0.1 + 0.24 * foeShare) * 100) / 100;
            const leg = foe.position().minus(body.position());
            const reach = Math.max(0.001, leg.length());
            const toward = [leg.x() / reach, leg.y() / reach, leg.z() / reach];
            const back = [-toward[0], -toward[1], -toward[2]];
            const approach = Math.max(0.12, Math.min(0.8, reach / 16));
            const mid = body.position().plus(foe.position()).scale(0.5);
            const avgArmor = shared[guardsplitArmor], avgTough = shared[guardsplitToughness];
            const changed = dims.some(function (id) {
                return shared[id] !== undefined && (Math.abs(mine[id] - shared[id]) > 1e-4 || Math.abs(theirs[id] - shared[id]) > 1e-4);
            });
            const shown = function (value: number | undefined): string { return value === undefined ? "—" : String(Math.round(value * 10) / 10); };
            const fizzle = function (text: string): void {
                WorldFeedback.emit(world, guardsplitScene, 1, body.position(), { moment: "fizzle", target: String(target.ref()) }, 16);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), text, [], 22);
            };
            if (Object.keys(shared).length === 0) { fizzle(guardsplitNoneText); done(action); return; }
            if (!changed) {
                WorldFeedback.emit(world, guardsplitScene, 1, body.position(),
                    { moment: "merge", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        point: [mid.x(), mid.y(), mid.z()], motes: motes, flow: 0, selfFlow: 0, foeFlow: 0,
                        selfSize: selfSize, foeSize: foeSize, toward: toward, back: back, approach: approach,
                        gauge: 0, armor: avgArmor, toughness: avgTough, scale: scale, exchange: 0, intensity: 0.8 }, 30);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), guardsplitFlatText, [], 26);
                sound(action, "minecraft:entity.illusioner.cast_spell");
                done(action);
                return;
            }
            // 先两端 carrier 成功：窗口既是共享身份，也是临时修饰的载体；任一端失败整对回滚。
            const windowSelf = MobEffects.apply(world, actor, guardsplitWindow, window, 0);
            if (windowSelf === null) { fizzle(guardsplitMissText); done(action); return; }
            const windowFoe = MobEffects.apply(world, target, guardsplitWindow, window, 0);
            if (windowFoe === null) {
                world.removeMobEffect(actor, guardsplitWindow, String(windowSelf.key()));
                fizzle(guardsplitMissText); done(action); return;
            }
            const layerSelf = CombatCopies.equalize(world, actor, shared, window, guardsplitSource, MobEffects.anchor(windowSelf));
            const layerFoe = layerSelf > 0
                ? CombatCopies.equalize(world, target, shared, window, guardsplitSource, MobEffects.anchor(windowFoe)) : -1;
            if (!(layerSelf > 0) || !(layerFoe > 0)) {
                if (layerSelf > 0) world.operation(layerSelf, "world_combat:dispel", "{}");
                const remainSelf = MobEffects.read(world, actor, guardsplitWindow);
                if (remainSelf !== null && String(remainSelf.key()) === String(windowSelf.key())) world.removeMobEffect(actor, guardsplitWindow, String(windowSelf.key()));
                const remainFoe = MobEffects.read(world, target, guardsplitWindow);
                if (remainFoe !== null && String(remainFoe.key()) === String(windowFoe.key())) world.removeMobEffect(target, guardsplitWindow, String(windowFoe.key()));
                fizzle(guardsplitMissText); done(action); return;
            }
            world.effect(guardsplitHum, actor, JSON.stringify({ pair: String(target.ref()) }), window);
            world.effect(guardsplitHum, target, JSON.stringify({ pair: String(actor.ref()) }), window);
            WorldFeedback.emit(world, guardsplitScene, 1, body.position(),
                { moment: "merge", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                    point: [mid.x(), mid.y(), mid.z()], motes: motes, flow: flow, selfFlow: selfFlow, foeFlow: foeFlow,
                    selfSize: selfSize, foeSize: foeSize, toward: toward, back: back, approach: approach,
                    gauge: gauge, armor: avgArmor, toughness: avgTough, scale: scale, exchange: 1,
                    intensity: Math.max(0.7, Math.min(2.2, gauge * 1.6 + 0.6)) }, 36);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), guardsplitLevelText,
                [shown(avgArmor), shown(avgTough)], 30);
            WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), guardsplitLevelText,
                [shown(avgArmor), shown(avgTough)], 30);
            sound(action, "minecraft:entity.illusioner.cast_spell");
            world.sound("minecraft:block.beacon.activate", body.position(), 14, "{}");
            done(action);
        }
    });

    // 窗口结束（自然到期、被驱散或被新一层替换）：撤回窗口拥有的场景，数值随载体一起回到原来的底子。
    WorldCombat.on("world_combat:move_guardsplit/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== guardsplitWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, guardsplitHum).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, guardsplitScene, 1, body.position(),
            { moment: "revert", target: String(actor.ref()), path: [String(actor.ref())] }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), guardsplitBackText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
