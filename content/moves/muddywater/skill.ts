/**
 * 浊流 / muddywater 的出手方式。
 *
 * 核心念头：**一道贴地向前推的浑浊泥浪**。它不快，但很阔：泥水从脚下整片漫出去，一层层扫过身前，
 *   把扇形里所有敌人的视线一起糊住；推完，扫过的地面只留下短泥膜。它区别于同族水招的地方就是这条
 *   「宽而低、单向推进的泥面」——冲浪是整圈水漫、水枪是细线、泡沫光线是黏人的泡沫球。
 *
 * 三幕：
 *   起（windup，提交前）：口边与脚边涌起一圈浑水、泥泡向内收，只播预告（可被打断）。
 *   漫（surge → hit）：提交后泥浪从脚下按 `sweep` 步向 `reach` 推进；每一步扫过一道扇环，环内每个
 *       非友方（最多 `maxTargets` 个）各吃一次 `surge`，且必须与脚下通视——挡住的片段到不了目标。
 *       有 `murkChance` 概率掉 `murkStages` 级命中并带上共享身份 `world_combat:status/murky`；
 *       泥浪会沿准线越过目标继续铺，横移或退远可以躲开后段。
 *   淤（silt / miss）：浪推完，扫过的地面只留下 `siltTicks` 之内的短泥膜粒子，到期自然散去；
 *       一个人都没扫到时播一个空浪。
 *
 * 与同族分开：唯一一条**贴地、单向、按步推进的宽泥浪**；画面上是低矮的褐色水墙向前抹，不是整圈、不是细线、
 *   不是会浮起的泡。选取是 `kind: "aim"`——方向或世界点都能放，目标为 null 时沿当前朝向照常推浪。
 *   命中下降走共享能力等级（NativeEffects.boost 的 accuracy）落到原生命中等级，同时挂真实 MobEffect
 *   （身份 murky + 伞身份 aim_impaired），对其他战斗者落到攻击变弱。
 */
namespace PokemonSkills {
    /** 把瞄准方向压到水平面；泥浪沿地面推出去。 */
    function muddywaterHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 扇环多边形：内弧 + 外弧围出的那段泥浪带，判定（sector∩ring）与表现（polygon）读同一片区域。 */
    function muddywaterBand(origin: CombatPoint, heading: CombatPoint, inner: number, outer: number, degrees: number): number[][] {
        const base = Math.atan2(heading.z(), heading.x());
        const half = (degrees * Math.PI / 180) / 2, steps = 8;
        const innerRadius = Math.max(0, inner), outerRadius = Math.max(innerRadius + 0.05, outer);
        const vertices: number[][] = [];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * innerRadius, origin.y(), origin.z() + Math.sin(angle) * innerRadius]);
        }
        for (let i = steps; i >= 0; i--) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * outerRadius, origin.y(), origin.z() + Math.sin(angle) * outerRadius]);
        }
        return vertices;
    }

    /**
     * 泥水糊眼的托管载体：把「目标头顶持续下坠的泥点」绑在真实状态效果的生命周期上，
     * 自然到期、牛奶／`/effect clear` 提前拿掉都随它一起停，不靠固定时长的 keep。
     */
    const muddywaterLingerMark = "world_combat:move_muddywater/linger_mark";

    function muddywaterLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, muddywaterEffect);
        if (carrier === null) { effect.end(); return; }
        const state = JSON.parse(effect.state() || "{}");
        const density = typeof state.density === "number" && state.density > 0 ? Math.round(state.density) : 6;
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "murk", muddywaterScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()), density: density });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(muddywaterLingerMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid muddywater linger mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(muddywaterLingerMark, "start", muddywaterLingerWatch);
    WorldCombat.effectHandler(muddywaterLingerMark, "watch", muddywaterLingerWatch);
    WorldCombat.effectHandler(muddywaterLingerMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 状态被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_muddywater/linger-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== muddywaterEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, muddywaterLingerMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: muddywaterId,
        cooldownParameter: "recharge",
        name: "Muddy Water",
        description: "从脚下向前推出一道贴地的浑浊泥浪：泥水一层层漫过身前大片，扇形里的敌人各挨一记，有概率被泥水糊住眼睛、掉命中，还会沿准线越过目标继续铺；掩体挡住的片段到不了目标，横移或退远能躲开后段。推完地面只留下一层短泥膜。淤积式铺得更宽更久更黏，急流式更重更快更远。",
        uses: ["一次糊住身前扇形里的一排敌人", "削掉对手的命中，为对手的下一轮攻击留出空门", "沿地面推进，隔着障碍打到正对着的那排敌人"],
        kind: "aim",
        range: 11,
        maxRange: 16,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 44,
        style: "mudwater",
        defaults: { silted: false, ai: { maxChase: 15, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(muddywaterId, "reach", pokemon), geometry: "cone", style: "mudwater",
                color: 0x6B5A3E, label: config && config.silted === true ? "浊流·淤积" : "浊流" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[muddywaterId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(muddywaterId, "tempo", context)),
                recover: Math.round(p(muddywaterId, "aftercast", context)),
                cooldown: Math.round(p(muddywaterId, "recharge", context)),
                active: 0,
                range: p(muddywaterId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("muddywater:gather", muddywaterScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", drops: Math.round(p(muddywaterId, "drops", action)),
                    silted: config && config.silted === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.25, 0));
            const heading = muddywaterHeading(aim(action));
            const power = p(muddywaterId, "surge", action);
            const reach = Math.max(4, p(muddywaterId, "reach", action));
            const span = Math.max(35, p(muddywaterId, "span", action));
            const steps = Math.max(3, Math.round(p(muddywaterId, "sweep", action)));
            const stages = Math.max(1, Math.min(2, Math.round(p(muddywaterId, "murkStages", action))));
            const chance = Math.max(0.05, Math.min(0.85, p(muddywaterId, "murkChance", action)));
            const murk = Math.max(40, Math.round(p(muddywaterId, "murkTicks", action)));
            const cap = Math.max(1, Math.round(p(muddywaterId, "maxTargets", action)));
            const drops = Math.max(10, Math.round(p(muddywaterId, "drops", action)));
            const filmTicks = Math.max(12, Math.round(p(muddywaterId, "siltTicks", action)));
            const scale = Math.max(0.5, Math.min(2.2, reach / 11));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            const scenes = WorldFeedback.actionScenes(muddywaterScene);
            const struck: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 独立余波：短泥膜只按自己的寿命停留，不替换任何方块。
                const film = Math.max(6, Math.round(drops * 0.5));
                WorldFeedback.emit(scope, muddywaterScene, 1, origin,
                    { moment: hits > 0 ? "silt" : "miss", film: film, drops: drops, scale: scale,
                        path: muddywaterBand(origin, heading, 0, reach, span) }, filmTicks);
                if (hits === 0)
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 0.9, 0)), muddywaterMissText, [], 24);
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = reach * (step + 1) / steps, inner = Math.max(0, reach * step / steps - 0.35);
                const wedge = WorldGeometry.sector(origin, heading, outer, span, { below: 2.2, above: 2.0 });
                const annulus = WorldGeometry.ring(origin, inner, outer, { below: 2.2, above: 2.0 });
                const region: WorldGeometry.Region = {
                    contains: function (point) { return wedge.contains(point) && annulus.contains(point); },
                    centre: function () { return origin; },
                    radius: function () { return annulus.radius(); }
                };
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref()) || struck[ref] || hits >= cap) return;
                    // 障碍逐段裁切：被挡住的切片不再往后铺，目标也吃不到这一记。
                    if (!scope.clear(origin, facts.position())) return;
                    struck[ref] = true;
                    if (!hurt(current, enemy, muddywaterId, power, { damage: damageSpec(muddywaterId, "surge") })) return;
                    hits++;
                    let murked = false;
                    if (scope.valid(enemy) && scope.random() < chance) {
                        murked = true;
                        NativeEffects.boost(scope, enemy, "accuracy", -stages);
                        MobEffects.apply(scope, enemy, muddywaterEffect, murk, 0);
                        if (scope.effects(enemy, muddywaterLingerMark).length === 0)
                            scope.effect(muddywaterLingerMark, enemy,
                                JSON.stringify({ density: Math.max(4, Math.min(10, Math.round(drops / 6))) }),
                                Math.max(1, Math.min(2400, murk)));
                    }
                    WorldFeedback.emit(scope, muddywaterScene, 1, facts.position(),
                        { moment: "hit", target: ref, drops: drops, intensity: intensity }, 26);
                    if (murked)
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), muddywaterMurkText, [stages], 32);
                });
                scenes.show(current, "front", origin,
                    { moment: "surge", path: muddywaterBand(origin, heading, inner, outer, span), drops: drops,
                        scale: scale, intensity: intensity });
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.waterpulse.actor");
            scenes.show(action, "front", origin,
                { moment: "surge", path: muddywaterBand(origin, heading, 0, 0.6, span), drops: drops,
                    scale: scale, intensity: intensity });
            advance(action);
        }
    });

    // 泥水糊眼自然干去（或被牛奶、/effect clear 解除）：在目标身上补一记抹眼，让糊眼有明确的结束。
    WorldCombat.on("world_combat:move_muddywater/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== muddywaterEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, muddywaterScene, 1, body.position(),
            { moment: "clear", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });
}
