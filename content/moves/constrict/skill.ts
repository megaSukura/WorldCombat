/**
 * 缠绕 / constrict 的出手方式。
 *
 * 核心念头：青藤或触手从身侧伸出、按 pace 沿释放时的三维线逐段爬向目标，第一个被线碰到的敌体才会被缠上；
 * 墙会截停，射空收藤。这一招伤害很低，价值全在**缠住之后**：压速度、短暂按在原地，把目标交给队友。
 * 攀缠式还会在束缚期间维持一根真实连接两端的藤，拉到极限或隔墙就断，断藤即恢复行动。
 *
 * 三幕：
 *   起（reach，提交前）：触手自身侧绷起、蓄势，只播预告。
 *   缠（grow → wrap / wall / miss，提交后）：从当刻身体中心沿释放方向逐段伸出，每段 `action.trace` 判定；
 *       首个有效敌体即结算一次 `squeeze` 接触伤害、挂 trapped 身份的束缚效果、按 speedStages 压速度、
 *       短定身 holdTicks；gripChance 概率再紧一道。墙截停、空放收藤，两者都不结算伤害。
 *   牵（bond，攀缠式）：束缚期间由托管效果维持两端真实连接，跟随双方身体；距离超过 reach+0.9 或中间有实墙
 *       就立即断藤，并只收回本实例自己挂上的束缚、定身与藤（不触碰其他施法者的效果）。
 *
 * 与同族分开：强力鞭打远而宽、藤鞭短而快、百万吨重踢直线踢飞；缠绕是唯一的控制招，命中后留下一段持续连接。
 * 提交后才触碰世界。选取：`kind: "aim"` 接受任意阵营实体或世界点——可自由上下瞄准，线没对准就抽空；
 * 单发伤害许可仍由命中层裁定，`target` 为 null 时按瞄准方向出藤。
 */
namespace PokemonSkills {
    const constrictScene = "world_combat:move_constrict";
    const constrictBind = "world_combat:constrict_bind";
    const constrictBond = "world_combat:constrict_bond";
    const constrictBindText = "world_combat.move.constrict.text.bind";
    const constrictMissText = "world_combat.move.constrict.text.miss";
    const constrictSnapText = "world_combat.move.constrict.text.snap";

    function constrictBondData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid constrict bond");
        ["reach", "selfHold", "scale", "notes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid constrict bond");
        });
        if (!(value.reach > 0) || value.selfHold < 1) throw new Error("Invalid constrict bond");
        return JSON.stringify(value);
    }

    // 攀缠式的实体连接：它只维持自己这根藤，并只收回自己挂上的束缚与定身，其他施法者的效果原样保留。
    WorldCombat.effect(constrictBond, 1, 400, "actor", constrictBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(constrictBond, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        // 当初那条藤仍在自己手里才维持；已被更强或更晚的施法者替换就直接收场。
        if (!world.valid(victim) || !data.carrier || !MobEffects.matches(world, victim, data.carrier)) { effect.end(); return; }
        effect.schedule("check", "check", 1, "{}");
    });
    WorldCombat.effectHandler(constrictBond, "check", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !data.carrier || !MobEffects.matches(world, victim, data.carrier)) { effect.end(); return; }
        const caster = world.actor(data.caster);
        if (caster === null || !world.valid(caster)) { data.reason = "snapped"; effect.state(JSON.stringify(data)); effect.end(); return; }
        const held = world.observe(victim), holder = world.observe(caster);
        if (held === null || holder === null) { data.reason = "snapped"; effect.state(JSON.stringify(data)); effect.end(); return; }
        const limit = data.reach + 0.9;
        const gap = held.position().minus(holder.position()).length();
        if (gap > limit || !world.clear(holder.position(), held.position())) {
            data.reason = "snapped"; effect.state(JSON.stringify(data));
            WorldFeedback.emit(world, constrictScene, 1, held.position(),
                { moment: "snap", target: String(victim.ref()), path: [String(caster.ref()), String(victim.ref())], notes: data.notes }, 26);
            WorldFeedback.text(world, held.position().plus(WorldCombat.point(0, 1.2, 0)), constrictSnapText, [], 24);
            world.sound("minecraft:block.vine.break", held.position(), 16, "{}");
            effect.end(); return;
        }
        // 连接到托管效果上，随它自然或提前结束一起收回；tension 越高线越亮、girth 越细。
        const tension = Math.max(0, Math.min(1, gap / limit));
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_constrict/latch", constrictScene, 1,
            held.position(), { moment: "latch", target: String(victim.ref()), path: ["source", "target"],
                tension: Math.round(tension * 100) / 100, girth: Math.round((0.11 - 0.06 * tension) * 1000) / 1000,
                scale: data.scale, notes: data.notes, bound: data.selfHold });
        effect.schedule("check", "check", 2, "{}");
    });
    WorldCombat.effectHandler(constrictBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const bind = MobEffects.read(world, victim, constrictBind);
            if (bind !== null && data.carrier && MobEffects.matches(world, victim, data.carrier))
                world.removeMobEffect(victim, constrictBind, bind.key());
            if (typeof data.root === "number" && data.root > 0) world.operation(data.root, "world_combat:dispel", "{}");
        }
        const caster = world.actor(data.caster);
        if (caster !== null && world.valid(caster) && typeof data.selfRoot === "number" && data.selfRoot > 0)
            world.operation(data.selfRoot, "world_combat:dispel", "{}");
    });
    WorldCombat.effectHandler(constrictBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        freeMovement: function (config) { return !!config.latch; },
        id: "constrict",
        cooldownParameter: "recharge",
        name: "Constrict",
        description: "青藤或触手按速度沿目标方向逐段爬出，第一个被这条线碰到的敌体才会被缠上；墙会截停，射空收藤。伤害很低，价值全在缠住之后：压速度、短暂按在原地，把目标交给队友或自己的下一招。攀缠式还会在束缚期间维持一根能被拉断或隔墙截断的藤。",
        uses: ["缠住一名跑得快的目标", "把对手按在原地交给队友", "用最低的代价给目标留一个持续减速"],
        kind: "aim",
        range: 2.9,
        maxRange: 4.6,
        prepare: 8,
        active: 16,
        recover: 7,
        cooldown: 16,
        style: "grapple",
        defaults: { latch: false, ai: { maxChase: 6, preferRunners: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("constrict", "reach", pokemon) + 0.3, geometry: "line", style: "grapple",
                color: 0x4E7A32, label: config && config.latch === true ? "缠绕·攀缠式" : "缠绕" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["constrict"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const latch = !!(config && config.latch);
            return {
                prepare: Math.round(p("constrict", "tempo", context)),
                recover: Math.round(p("constrict", "aftercast", context)),
                cooldown: Math.round(p("constrict", "recharge", context)),
                active: skills["constrict"].active,
                range: p("constrict", "reach", context) + (latch ? 0.2 : 0.35)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_constrict:reach", constrictScene, 1, action.origin(),
                JSON.stringify({ moment: "reach", latch: config && config.latch === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const anchor = action.origin();
            const start = WorldCombat.point(anchor.x(), anchor.y(), anchor.z());
            const direction = aim(action);
            const reach = Math.max(2.2, p("constrict", "reach", action));
            const pace = Math.max(0.3, p("constrict", "pace", action));
            const tipWidth = Math.max(0.2, p("constrict", "tip", action));
            const notes = Math.max(6, Math.round(p("constrict", "notes", action)));
            const selfHold = Math.max(8, Math.round(p("constrict", "selfHold", action)));
            const latch = !!(config && config.latch);
            const scale = reach / 2.8;
            const grow = WorldFeedback.actionScenes(constrictScene);
            let travelled = 0, settled = false;

            sound(action, "minecraft:block.vine.place");

            function complete(current: CombatAction): void {
                if (settled) return;
                settled = true;
                grow.finish(current, done);
            }

            /** 触手停在墙前，或走满 reach 也没碰到人：收藤，不结算任何东西。 */
            function retract(current: CombatAction, reason: "wall" | "empty", impact: CombatImpact | null): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const at = impact !== null ? impact.position() : (body !== null ? body.position() : start);
                grow.stop(current, "tendril");
                if (reason === "wall" && impact !== null) {
                    WorldFeedback.emit(scope, constrictScene, 1, at,
                        { moment: "wall", face: impact.blockFace(), path: [[start.x(), start.y(), start.z()], [at.x(), at.y(), at.z()]],
                            notes: Math.round(notes * 0.5), scale: scale }, 18);
                }
                WorldFeedback.emit(scope, constrictScene, 1, at, { moment: "miss", notes: Math.round(notes * 0.7), scale: scale }, 18);
                if (body !== null) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), constrictMissText, [], 18);
                sound(current, "minecraft:block.vine.break");
                complete(current);
            }

            /** 触手够到第一个有效敌体：一次弱伤，然后挂上束缚、降速与定身。伤害被拒绝就不当缠上。 */
            function wrap(current: CombatAction, target: CombatActor, at: CombatPoint): void {
                const scope = current.world();
                const body = scope.observe(target);
                if (body === null || !scope.valid(target)) { retract(current, "empty", null); return; }
                const context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["constrict"],
                    detail: { values: config }, world: scope, actor: actor, target: { world: scope, actor: target } };
                const power = p("constrict", "squeeze", context);
                const stages = Math.max(1, Math.round(p("constrict", "speedStages", context)));
                const bindTicks = Math.max(30, Math.round(p("constrict", "bindTicks", context)));
                const holdTicks = Math.max(8, Math.round(p("constrict", "holdTicks", context)));
                const grip = Math.max(0, Math.min(1, p("constrict", "gripChance", context)));
                grow.stop(current, "tendril");
                const landed = hurt(current, target, "constrict", power, { damage: damageSpec("constrict", "squeeze"), contact: true });
                if (!landed || !scope.valid(target)) {
                    WorldFeedback.emit(scope, constrictScene, 1, at, { moment: "miss", target: String(target.ref()), notes: Math.round(notes * 0.7), scale: scale }, 18);
                    if (scope.valid(target)) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), constrictMissText, [], 18);
                    sound(current, "minecraft:block.vine.break");
                    complete(current); return;
                }
                const extra = scope.random() < grip ? 1 : 0;
                const carrier = MobEffects.apply(scope, target, constrictBind, bindTicks, 0);
                if (carrier !== null) NativeEffects.boostWindow(scope, target, { spe: -(stages + extra) }, bindTicks, "world_combat:move/constrict", carrier);
                else NativeEffects.boost(scope, target, "spe", -(stages + extra));
                const root = scope.effect("world_combat:rooted", target, "{}", holdTicks);
                let selfRoot = 0;
                if (latch && scope.valid(actor)) selfRoot = scope.effect("world_combat:rooted", actor, "{}", selfHold);
                if (latch && carrier !== null) {
                    const existing = scope.effects(target, constrictBond);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    scope.effect(constrictBond, target, JSON.stringify({ caster: String(actor.ref()), reach: reach, selfHold: selfHold,
                        scale: scale, notes: notes, carrier: MobEffects.anchor(carrier), root: root, selfRoot: selfRoot, reason: "" }), bindTicks + 40);
                }
                WorldFeedback.emit(scope, constrictScene, 1, body.position(),
                    { moment: "bind", path: [[start.x(), start.y(), start.z()], [body.position().x(), body.position().y(), body.position().z()]],
                        target: String(target.ref()), notes: notes, scale: scale }, 18);
                WorldFeedback.emit(scope, constrictScene, 1, body.position(),
                    { moment: "squeeze", target: String(target.ref()), stages: stages + extra, bound: bindTicks,
                        notes: notes, scale: scale, intensity: Math.max(0.5, Math.min(2.0, power / 14)), latch: latch ? 1 : 0 }, 26);
                WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), constrictBindText, [stages + extra], 24);
                sound(current, "cobblemon:impact.normal");
                complete(current);
            }

            /** 一段一段地伸出：每段先按真实墙裁剪，再看首个接触是不是有效敌体。 */
            function extend(current: CombatAction): void {
                const scope = current.world();
                const from = start.plus(direction.scale(travelled));
                const span = Math.min(pace, Math.max(0, reach - travelled));
                const to = start.plus(direction.scale(travelled + span));
                const impact = current.trace(from, to, tipWidth);
                if (impact.hitEntity()) {
                    const target = impact.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { wrap(current, target, impact.position()); return; }
                    // 友方与非生物只是穿过去，继续找第一个有效敌体。
                }
                if (impact.blocked()) { retract(current, "wall", impact); return; }
                travelled += span;
                grow.show(current, "tendril", to, { moment: "grow",
                    path: [[start.x(), start.y(), start.z()], [to.x(), to.y(), to.z()]],
                    notes: notes, scale: scale, taut: Math.round((1 - travelled / reach) * 100) / 100, latch: latch ? 1 : 0 });
                if (travelled >= reach - 1e-3) { retract(current, "empty", null); return; }
                current.after(1, extend);
            }

            extend(action);
        }
    });

    // 束缚期间维持低密度的藤环围绕目标：少而稳，缠在身侧，让玩家看得清目标本身。
    WorldCombat.on("world_combat:move_constrict/held", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== constrictBind || event.world().tick() % 10 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_constrict/hold/" + String(actor.ref()), constrictScene, 1,
            body.position(), { moment: "hold", target: String(actor.ref()) }, 30);
    });

    // 束缚走完自己的时间或被外力解除：藤环散开、叶片落下。
    WorldCombat.on("world_combat:move_constrict/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== constrictBind) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, constrictScene, 1, body.position(), { moment: "release", target: String(actor.ref()) }, 24);
    });

    // 束缚被提前清除（牛奶、/effect clear、别的脚本）时，同一实例的攀缠连接立刻收场，不等下一跳。
    WorldCombat.on("world_combat:move_constrict/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== constrictBind) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const bonds = world.effects(actor, constrictBond);
        for (let i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
    });
}
