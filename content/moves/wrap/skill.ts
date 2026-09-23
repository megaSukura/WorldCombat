/**
 * 紧束 / wrap 的出手方式。
 *
 * 核心念头：**甩出一圈藤蔓把目标裹住、绞紧**——命中就把它钉在原地、把它的力气一并压住，藤茧自己收紧，
 * 不需要施法者维持：甩完就能走开。目标是**真的被钉住**：动不了、打不痛，每隔一会儿被绞一次伤害；
 * 只能等藤茧走完，或被外力一脚踹到足够快把藤茧撕开。
 *
 * 三幕：
 *   起（windup，提交前）：藤蔓在身侧盘起、蓄势，只播预告。
 *   裹（lash → coil）：提交后沿瞄准方向甩出一圈藤；裹住第一个活体即结算一记 crush 接触伤害、挂上
 *       `world_combat:status/partiallytrapped`（本单元 `world_combat:wrap_coil`）、按 atkStages 压住攻击、
 *       并用 rooted 把它钉在原地。
 *   绞（crush / release / torn）：绑定效果每 2 刻维持藤茧表现；每 `interval` 绞一次。藤茧走完自己的时间、
 *       被外力清掉、目标倒下时松开；目标被推到超过 `tearSpeed` 就提前撕开。
 *
 * 与同族分开：绑紧把目标拴在施法者身边拖着走、越拉越紧、施法者也被拖慢；紧束把藤茧独立留在目标身上，
 * 施法者可离开，目标是钉住 + 攻击被压，伤害平稳不递增。与缠绕（一次性减速＋短定身）也不同。
 *
 * 配置 `cocoon`（密缠式）由 resolve 改时序、由公式改威力／时长／攻击压制／撕开阈值，提交后才触碰世界。
 */
namespace PokemonSkills {
    const wrapScene = "world_combat:move_wrap";
    const wrapCoil = "world_combat:wrap_coil";
    const wrapBond = "world_combat:wrap_bond";
    const wrapCoilKey = "wrap:coil:";
    const wrapCoilText = "world_combat.move.wrap.text.coil";
    const wrapCrushText = "world_combat.move.wrap.text.crush";
    const wrapReleaseText = "world_combat.move.wrap.text.release";
    const wrapTornText = "world_combat.move.wrap.text.torn";

    function wrapBondData(json: string): string {
        const value = JSON.parse(json);
        ["crush", "interval", "coilHeight", "tearSpeed", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid wrap bond");
        });
        if (value.interval < 1 || value.coilHeight <= 0 || value.tearSpeed <= 0) throw new Error("Invalid wrap bond");
        return JSON.stringify(value);
    }

    WorldCombat.effect(wrapBond, 1, 400, "actor", wrapBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(wrapBond, "start", function (effect) { effect.schedule("squeeze", "squeeze", 1, "{}"); });
    WorldCombat.effectHandler(wrapBond, "squeeze", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        if (world.mobEffect(victim, wrapCoil) === null) { data.reason = "released"; effect.state(JSON.stringify(data)); effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        if (world.tick() > (data.grace || 0) && body.velocity().length() > data.tearSpeed) {
            data.reason = "torn"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            hurt(world, victim, "wrap", data.crush, { damage: damageSpec("wrap", "crush"), contact: true });
            if (!world.valid(victim)) { effect.end(); return; }
            const at = world.observe(victim);
            if (at !== null) {
                WorldFeedback.emit(world, wrapScene, 1, at.position(),
                    { moment: "crush", target: String(victim.ref()), notes: data.notes, pulses: data.pulses,
                        intensity: Math.max(0.5, Math.min(2.2, data.crush / 18)) }, 18);
                WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.3, 0)), wrapCrushText, [data.pulses], 18);
            }
            world.sound("minecraft:block.wool.step", at !== null ? at.position() : body.position(), 14, "{}");
        }
        WorldFeedback.keep(world, wrapCoilKey + String(victim.ref()), wrapScene, 1, body.position(),
            { moment: "coil", target: String(victim.ref()), height: data.coilHeight, notes: data.notes, pulses: data.pulses || 0 }, 20);
        effect.schedule("squeeze", "squeeze", 2, "{}");
    });
    WorldCombat.effectHandler(wrapBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const coil = MobEffects.read(world, victim, wrapCoil);
            if (coil !== null) world.removeMobEffect(victim, wrapCoil, coil.key());
            // 提前撕开时，把本单元这一份 rooted 一并解掉（按来源过滤，别动别人的）。
            const roots = world.effects(victim, "world_combat:rooted");
            for (let i = 0; i < roots.length; i++) if (String(roots[i].source().ref()) === String(world.source().ref()))
                world.operation(roots[i].id(), "world_combat:dispel", "{}");
            const body = world.observe(victim);
            if (body !== null) {
                WorldFeedback.emit(world, wrapScene, 1, body.position(),
                    { moment: data.reason === "torn" ? "torn" : "release", target: String(victim.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                    data.reason === "torn" ? wrapTornText : wrapReleaseText, [], 22);
            }
        }
    });
    WorldCombat.effectHandler(wrapBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "wrap",
        cooldownParameter: "recharge",
        name: "Wrap",
        description: "A ring of long body or vines wraps the target head to foot, pinning it in place and squeezing the strength out of its blows. The coil tightens on its own, so the user can walk away; it lasts until it runs out or is torn open by a strong shove.",
        uses: ["钉住一个危险目标并压住它的攻击", "把对手按在原地交给队友", "用藤茧独自磨掉一个难缠的近战目标"],
        kind: "enemy",
        range: 2.7,
        maxRange: 3.8,
        prepare: 8,
        active: 14,
        recover: 7,
        cooldown: 38,
        style: "coil",
        defaults: { cocoon: false, ai: { maxChase: 5, preferHard: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("wrap", "reach", pokemon) + 0.2, geometry: "circle", style: "coil", color: 0x7E9C5A,
                label: config && config.cocoon === true ? "密缠式" : "速缠式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["wrap"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("wrap", "tempo", context)),
                recover: Math.round(p("wrap", "aftercast", context)),
                cooldown: Math.round(p("wrap", "recharge", context)),
                active: skills["wrap"].active,
                range: p("wrap", "reach", context) + 0.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_wrap:coil", wrapScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", cocoon: config && config.cocoon === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(2.0, p("wrap", "reach", action));
            const grip = Math.max(0.35, p("wrap", "grip", action));
            const end = origin.plus(direction.scale(reach));
            WorldFeedback.emit(world, wrapScene, 1, origin,
                { moment: "lash", path: [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]] }, 14);
            sound(action, "minecraft:block.vine.place");

            const grab = action.trace(origin, end, grip);
            const target = grab.hitEntity() ? grab.target() : null;
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, wrapScene, 1, end, { moment: "whiff" }, 16);
                done(action);
                return;
            }
            const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["wrap"],
                detail: { values: config }, world: world, actor: action.actor(), target: { world: world, actor: target } };
            const crush = p("wrap", "crush", action);
            const coilTicks = Math.max(60, Math.round(p("wrap", "coilTicks", action)));
            const interval = Math.max(6, Math.round(p("wrap", "interval", action)));
            const stages = Math.max(1, Math.round(p("wrap", "atkStages", context)));
            const coilHeight = Math.max(0.9, p("wrap", "coilHeight", context));
            const tearSpeed = Math.max(0.2, p("wrap", "tearSpeed", action));
            const notes = Math.max(8, Math.round(p("wrap", "notes", action)));

            if (!hurt(action, target, "wrap", crush, { damage: damageSpec("wrap", "crush"), contact: true })) { done(action); return; }
            if (!CombatStatus.apply(world, target, "partiallytrapped", wrapCoil, coilTicks, 0, { unique: true })) { done(action); return; }
            WorldEffects.apply(world, target, "rooted", {}, coilTicks);
            NativeEffects.boost(world, target, "atk", -stages);
            const body = world.observe(target);
            if (body === null) { done(action); return; }
            const state = { crush: crush, interval: interval, coilHeight: coilHeight, tearSpeed: tearSpeed, notes: notes,
                next: world.tick() + interval, grace: world.tick() + 8, pulses: 0, reason: "" };
            const existing = world.effects(target, wrapBond);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(wrapBond, target, JSON.stringify(state), coilTicks + 40);
            WorldFeedback.emit(world, wrapScene, 1, body.position(),
                { moment: "seize", target: String(target.ref()), height: coilHeight, notes: notes, stages: stages }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), wrapCoilText, [stages], 24);
            sound(action, "cobblemon:impact.normal");
            done(action);
        }
    });
}
