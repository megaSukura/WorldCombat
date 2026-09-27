/** Temporarily exchange current stage advantages through owned layers; later changes remain independent. */
namespace PokemonSkills {
    export const powerswapScene = "world_combat:move_powerswap";
    export const powerswapStreamScene = "world_combat:move_powerswap_stream";
    export const powerswapWindow = "world_combat:powerswap_window";
    export const powerswapMark = "world_combat:powerswap_mark";
    export const powerswapSwapText = "world_combat.move.powerswap.text.swapped";
    export const powerswapEvenText = "world_combat.move.powerswap.text.even";
    export const powerswapBackText = "world_combat.move.powerswap.text.reverted";
    export const powerswapMissText = "world_combat.move.powerswap.text.miss";

    interface PowerswapMark { atk: number; spa: number; pair: string; }

    WorldCombat.effect(powerswapMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["atk", "spa"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid power swap stage: " + key);
        });
        if (typeof value.pair !== "string") throw new Error("Invalid power swap partner");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powerswapMark, "start", function () { });
    WorldCombat.effectHandler(powerswapMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 一位战斗者某个能力当前的等级（宝可梦读原生阶梯，其他生物读公共阶梯）。 */
    export function powerswapStageOf(world: CombatWorld, actor: CombatActor, stat: string): number {
        if (!world.valid(actor)) return 0;
        if (String(actor.domain()) === "cobblemon") return NativeEffects.stage(NativeEffects.read(world, actor), stat);
        return CombatStages.stage(world, actor, stat);
    }
    /** 攻势合计（攻 + 特攻的等级），供外部只读消费；AI 决策按实际用法加权，见 ai.ts。 */
    export function powerswapOffence(world: CombatWorld, actor: CombatActor): number {
        return powerswapStageOf(world, actor, "atk") + powerswapStageOf(world, actor, "spa");
    }
    function powerswapStages(world: CombatWorld, actor: CombatActor): number[] {
        return [powerswapStageOf(world, actor, "atk"), powerswapStageOf(world, actor, "spa")];
    }
    /** Each layer owns its contribution; native carrier removal closes it without rewriting the base ladder. */
    function powerswapLayer(world: CombatWorld, actor: CombatActor, from: number[], to: number[], ticks: number, carrier: CombatMobEffect): void {
        const left = [to[0] - from[0], to[1] - from[1]], names = ["atk", "spa"];
        for (let part = 0; part < 2; part++) {
            const changes: { [stat: string]: number } = {};
            names.forEach(function (stat, index) {
                const delta = Math.max(-6, Math.min(6, left[index]));
                if (delta) changes[stat] = delta;
                left[index] -= delta;
            });
            if (!Object.keys(changes).length) continue;
            if (String(actor.domain()) === "cobblemon") NativeModifiers.apply(world, actor,
                { stages: changes, carrier: MobEffects.anchor(carrier), source: "world_combat:move/powerswap" }, ticks);
            else CombatStages.window(world, actor, changes, ticks, "world_combat:move/powerswap", MobEffects.anchor(carrier));
        }
    }

    define({
        id: "powerswap",
        cooldownParameter: "recharge",
        name: "力量互换",
        description: "把自己与一名选中战斗者的攻击和特攻能力等级暂时对换。敌人和伙伴都可选；窗口结束只收回这次交换，期间其他来源的变化保留。",
        uses: ["把对手涨起来的攻/特攻夺过来", "在自己被降攻后把负数甩给对手", "在对手强化成型时把气势整个接走"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 70,
        style: "swap",
        stationary: true,
        defaults: { ai: { maxChase: 12, margin: 1, leaveStation: false, share: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["powerswap"], detail: { values: config } };
            return { radius: p("powerswap", "reach", context), geometry: "line", style: "swap", color: 0xFF9A4E, label: "力量互换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powerswap"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("powerswap", "tempo", context)),
                recover: Math.round(p("powerswap", "aftercast", context)),
                cooldown: Math.round(p("powerswap", "recharge", context)),
                active: 1,
                range: p("powerswap", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, actor, "powerswap") || CombatStatus.has(world, target, "powerswap")) return "already-swapped";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("powerswap", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:powerswap:" + action.id(), powerswapScene, 1, action.origin(),
                JSON.stringify({ moment: "read", target: action.target() === null ? "" : String(action.target()!.ref()),
                    path: [String(action.actor().ref()), action.target() === null ? String(action.actor().ref()) : String(action.target()!.ref())],
                    streams: Math.max(1, Math.round(p("powerswap", "threads", action))) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();

            // 轻散：无目标、被挡、重复或载体失败都只做一次轻散与一行说明，不假装完成了双向移交。
            function lightScatter(moment: string, key: string, ticks: number): void {
                WorldFeedback.emit(world, powerswapScene, 1, origin, { moment: moment, target: target === null ? "" : String(target.ref()) }, ticks);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), key, [], ticks + 6);
            }

            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) {
                lightScatter("fizzle", powerswapMissText, 16);
                done(action);
                return;
            }
            const foe = world.observe(target);
            if (foe === null) { lightScatter("fizzle", powerswapMissText, 16); done(action); return; }
            // 提交时再次确认双方资格与可达；任一方不再满足就按实际结果轻散。
            if (foe.position().minus(origin).length() > p("powerswap", "reach", action) || !world.clear(origin, foe.position())
                || CombatStatus.has(world, actor, "powerswap") || CombatStatus.has(world, target, "powerswap")) {
                lightScatter("fizzle", powerswapMissText, 18);
                done(action);
                return;
            }
            const window = Math.max(80, Math.round(p("powerswap", "span", action)));
            const streams = Math.max(1, Math.round(p("powerswap", "threads", action)));
            const scale = (body.width() + body.height()) / 2.3;
            const mine = powerswapStages(world, actor), theirs = powerswapStages(world, target);
            const gap = Math.abs(theirs[0] - mine[0]) + Math.abs(theirs[1] - mine[1]);
            const spread = Math.max(0.5, Math.min(1.4, 0.55 + gap * 0.12));
            const even = mine[0] === theirs[0] && mine[1] === theirs[1];

            if (even) {
                lightScatter("even", powerswapEvenText, 22);
                sound(action, "minecraft:entity.illusioner.cast_spell");
                done(action);
                return;
            }

            const selfCarrier = MobEffects.apply(world, actor, powerswapWindow, window, 0);
            const otherCarrier = MobEffects.apply(world, target, powerswapWindow, window, 0);
            if (selfCarrier === null || otherCarrier === null) {
                if (selfCarrier) MobEffects.consume(world, actor, powerswapWindow);
                if (otherCarrier) MobEffects.consume(world, target, powerswapWindow);
                lightScatter("fizzle", powerswapMissText, 18);
                world.sound("minecraft:block.beacon.deactivate", origin, 12, "{}");
                done(action);
                return;
            }
            powerswapLayer(world, actor, mine, theirs, window, selfCarrier);
            powerswapLayer(world, target, theirs, mine, window, otherCarrier);
            // 持续只标在双方身上；连线不暗示超远仍有新增作用。
            const selfMark = world.effect(powerswapMark, actor, JSON.stringify({ atk: mine[0], spa: mine[1], pair: String(target.ref()) }), window);
            const otherMark = world.effect(powerswapMark, target, JSON.stringify({ atk: theirs[0], spa: theirs[1], pair: String(actor.ref()) }), window);
            [{ id: selfMark, owner: actor, pair: target }, { id: otherMark, owner: target, pair: actor }].forEach(function (entry) {
                const facts = world.observe(entry.owner);
                if (facts) WorldFeedback.onEffect(world, entry.id, "powerswap:hum:" + String(entry.owner.ref()), powerswapScene, 1,
                    facts.position(), { moment: "hum", target: String(entry.owner.ref()), pair: String(entry.pair.ref()) });
            });

            // 两束从两端交叉移交：自定义场景读双方真实位置，逐刻把光点从一端送到另一端。
            const intensity = Math.max(0.7, Math.min(2.2, gap / 3 + 0.6));
            WorldFeedback.emit(world, powerswapStreamScene, 1, origin,
                { self: String(actor.ref()), target: String(target.ref()),
                    selfAtk: mine[0], selfSpa: mine[1], foeAtk: theirs[0], foeSpa: theirs[1],
                    count: streams, gap: gap, spread: spread, scale: scale, intensity: intensity,
                    start: world.tick(), duration: 46 }, 52);

            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), powerswapSwapText,
                [theirs[0] >= 0 ? "+" + theirs[0] : String(theirs[0]), theirs[1] >= 0 ? "+" + theirs[1] : String(theirs[1])], 30);
            WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), powerswapSwapText,
                [mine[0] >= 0 ? "+" + mine[0] : String(mine[0]), mine[1] >= 0 ? "+" + mine[1] : String(mine[1])], 30);
            sound(action, "minecraft:entity.illusioner.cast_spell");
            world.sound("minecraft:block.beacon.power_select", origin, 14, "{}");
            done(action);
        }
    });

    // 窗口走完或被清除：只结束本次攻势交换层，画面静收；其余修饰不受影响。
    WorldCombat.on("world_combat:move_powerswap/revert", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== powerswapWindow) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, powerswapMark);
        let pair = "";
        if (marks.length) {
            const mark: PowerswapMark = JSON.parse(String(marks[0].data()));
            pair = String(mark.pair);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, powerswapScene, 1, body.position(),
            { moment: "revert", target: String(actor.ref()), pair: pair }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), powerswapBackText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
