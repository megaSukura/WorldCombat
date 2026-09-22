/**
 * 泡沫 / bubble 的出手方式。
 *
 * 核心念头：**一口气吹出无数泡泡铺满身前**。它单个很轻，卖的是「多」与「快」：`puffs` 个泡泡沿瞄准
 *   方向张开 `span` 度一次铺出去，速度够快时再补一轮；每个泡泡自己飞、自己撞，一层层糊住身前一大片。
 *   它区别于同族水招的地方就是这条「散开的泡群」——水枪是细线、泡沫光线是一团会黏的泡球、浊流是一条贴地泥浪。
 *
 * 两幕（简单念头两拍就完整）：
 *   起（windup，提交前）：口边冒出越聚越多的小泡，只播预告（可被打断）。
 *   吹（volley → target / pop）：提交后按 `volleys` 轮吹出泡群；每个非友方每次施放只认真挨一次 `spray`，
 *       有 `sudsChance` 概率掉 `sudsStages` 级速度并带上共享身份 `world_combat:status/sudsy`；后续撞上的
 *       泡泡只是噗地破掉（pop）。一个人都没糊到就播一个空泡。
 *
 * 速度下降走共享能力等级（NativeEffects.boost 的 spe），宝可梦落到原生速度等级，其他战斗者落到移动速度属性。
 */
namespace PokemonSkills {
    /** 一口泡群铺开的扇形多边形：顶点 + 外弧，判定（sector）与表现（polygon）读同一片区域。 */
    function bubbleFan(origin: CombatPoint, heading: CombatPoint, reach: number, degrees: number): number[][] {
        const base = Math.atan2(heading.z(), heading.x());
        const half = (degrees * Math.PI / 180) / 2, steps = 7;
        const vertices: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * reach, origin.y(), origin.z() + Math.sin(angle) * reach]);
        }
        return vertices;
    }

    /** 把瞄准方向压到水平面；泡群按地面方向铺出去。 */
    function bubbleHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: bubbleId,
        name: "Bubble",
        description: "一口气吹出无数泡泡，沿瞄准方向张开一个扇形铺出去：身前一大片里的敌人各挨一记轻伤害，有概率被打滑、掉速度；速度快的个体多吹一轮。密泡式泡更多更黏更软，急泡式更快更远。",
        uses: ["起手极短、PP 省，缠斗里反复吹", "一次打到身前扇形里的好几个敌人", "把跑得快的对手打滑，压它速度"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 20,
        maximumTicks: 200,
        style: "bubbles",
        defaults: { dense: false, ai: { maxChase: 13, crippleRunners: true, skipSudsy: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(bubbleId, "reach", pokemon), geometry: "cone", style: "bubbles",
                color: 0xBFEFFF, label: config && config.dense === true ? "泡沫·密泡" : "泡沫" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[bubbleId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(bubbleId, "tempo", context)),
                recover: Math.round(p(bubbleId, "aftercast", context)),
                cooldown: Math.round(p(bubbleId, "recharge", context)),
                active: 0,
                range: p(bubbleId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bubble:gather", bubbleScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", bubbles: Math.round(p(bubbleId, "bubbles", action)),
                    dense: config && config.dense === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p(bubbleId, "spray", action);
            const reach = Math.max(4, p(bubbleId, "reach", action));
            const span = Math.max(30, p(bubbleId, "span", action));
            const volleys = Math.max(1, Math.min(2, Math.round(p(bubbleId, "volleys", action))));
            const puffs = Math.max(3, Math.min(8, Math.round(p(bubbleId, "puffs", action))));
            const gap = Math.max(2, Math.round(p(bubbleId, "gap", action)));
            const velocity = Math.max(0.8, p(bubbleId, "velocity", action));
            const radius = Math.max(0.1, p(bubbleId, "collisionRadius", action));
            const stages = Math.max(1, Math.min(2, Math.round(p(bubbleId, "sudsStages", action))));
            const chance = Math.max(0.03, Math.min(0.6, p(bubbleId, "sudsChance", action)));
            const suds = Math.max(40, Math.round(p(bubbleId, "sudsTicks", action)));
            const bubbles = Math.max(10, Math.round(p(bubbleId, "bubbles", action)));
            const dense = !!(config && config.dense);
            const intensity = Math.max(0.5, Math.min(2.2, power / 40));
            const struck: { [ref: string]: boolean } = {};
            let fired = 0, inFlight = 0, hits = 0, settled = false;

            function complete(current: CombatAction): void {
                inFlight--;
                if (settled || fired < volleys || inFlight > 0) return;
                settled = true;
                if (hits === 0)
                    WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.9, 0)),
                        bubbleMissText, [], 22);
                done(current);
            }

            function onHit(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                const point = hit.position();
                if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                    WorldFeedback.emit(scope, bubbleScene, 1, point,
                        { moment: "pop", bubbles: Math.round(bubbles * 0.35), intensity: intensity }, 16);
                    return;
                }
                const ref = String(victim.ref());
                if (struck[ref]) {
                    WorldFeedback.emit(scope, bubbleScene, 1, point,
                        { moment: "pop", target: ref, bubbles: Math.round(bubbles * 0.35), intensity: intensity }, 16);
                    return;
                }
                struck[ref] = true;
                if (!impact(current, hit, bubbleId, power, { damage: damageSpec(bubbleId, "spray") })) return;
                hits++;
                let sudsed = false;
                if (scope.valid(victim) && scope.random() < chance) {
                    sudsed = true;
                    NativeEffects.boost(scope, victim, "spe", -stages);
                    MobEffects.apply(scope, victim, bubbleEffect, suds, 0);
                }
                WorldFeedback.emit(scope, bubbleScene, 1, point,
                    { moment: "target", target: ref, stages: stages, sudsed: sudsed ? 1 : 0,
                        bubbles: bubbles, intensity: intensity }, 22);
                if (sudsed)
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), bubbleSudsText, [stages], 30);
            }

            function fire(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                const from = body === null ? current.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0));
                const heading = bubbleHeading(body === null ? current.direction() : current.targetPosition().minus(from));
                const fan = span * Math.PI / 180;
                for (let i = 0; i < puffs; i++) {
                    const offset = puffs <= 1 ? 0 : (i / (puffs - 1) - 0.5) * fan;
                    const cos = Math.cos(offset), sin = Math.sin(offset);
                    const direction = WorldCombat.point(heading.x() * cos - heading.z() * sin, heading.y(),
                        heading.x() * sin + heading.z() * cos);
                    inFlight++;
                    LivingActions.projectile(current, {
                        speed: velocity, range: reach, radius: radius, direction: direction, gravity: 0,
                        lifetime: Math.max(16, Math.round(reach / Math.max(0.2, velocity)) + 12),
                        appearance: { sprite: "cobblemon:generic/bubble/smallbubble", tint: 0xBFEFFF, glow: true,
                            scale: Math.max(0.7, radius / 0.16), pierce: 1 },
                        impact: onHit
                    }, complete);
                }
                fired++;
                WorldFeedback.keep(scope, "bubble:fan:" + current.id(), bubbleScene, 1, from,
                    { moment: "fan", path: bubbleFan(from, heading, reach, span), bubbles: bubbles, puffs: puffs,
                        volleys: volleys, intensity: intensity, dense: dense ? 1 : 0 }, 44);
                if (fired < volleys) current.after(gap, function (next: CombatAction) { fire(next); });
            }

            sound(action, "cobblemon:move.bubble.actor");
            fire(action);
        }
    });

    // 泡泡打滑自然干了（或被外力清掉）：在目标身上补一记破泡，让「打滑」有明确的结束。
    WorldCombat.on("world_combat:move_bubble/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bubbleEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, bubbleScene, 1, body.position(),
            { moment: "clear", target: String(actor.ref()), cause: String(data.cause || "") }, 18);
    });

    // 打滑期间，目标脚边维持一圈缓慢上浮、不断破掉的小泡：少而稳，让出本体视线。
    WorldCombat.on("world_combat:move_bubble/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bubbleEffect || event.world().tick() % 10 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "bubble:suds:" + String(actor.ref()), bubbleScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), bubbles: 10 }, 40);
    });
}
