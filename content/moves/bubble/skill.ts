/**
 * 泡沫 / bubble 的出手方式。
 *
 * 核心念头：**一口气吹出无数泡泡铺满身前**。它单个很轻，卖的是「多」与「快」：`puffs` 个泡泡沿瞄准
 *   方向张开 `span` 度一次铺出去，速度够快时再补一轮；每个泡泡自己飞、自己撞，一层层糊住身前一大片。
 *   它区别于同族水招的地方就是这条「散开的泡群」——水枪是细线、泡沫光线是一团会黏的泡球、浊流是一条贴地泥浪。
 *
 * 两幕（简单念头两拍就完整）：
 *   起（windup，提交前）：口边冒出越聚越多的小泡，只播预告（可被打断）。
 *   吹（volley → target / pop）：提交后按 `volleys` 轮吹出泡群；每个非友方**每波只认真挨一次** `spray`
 *       （同一波里多粒泡打到同一人只算一次，不让视觉泡重复无限伤害），有 `sudsChance` 概率掉 `sudsStages`
 *       级速度并带上共享身份 `world_combat:status/sudsy`；后续撞上的泡泡只是噗地破掉（pop），撞墙的泡各自破裂。
 *       一个人都没糊到就播一个空泡。
 *
 * 选取是 `kind: "aim"`——方向或世界点都能放，目标为 null 时沿当前朝向照常飘泡；实体只是更容易命中。
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

    /** 从实际发射口到当刻瞄准点；点为空时退回施法者朝向。 */
    function bubbleAim(action: CombatAction, from: CombatPoint): CombatPoint {
        const at = action.targetPosition();
        const delta = at.minus(from);
        return bubbleHeading(delta.length() < 0.05 ? action.direction() : delta);
    }

    /**
     * 打滑存续的托管载体：把「脚边持续上浮的小泡」绑在真实状态效果的生命周期上，
     * 自然到期、牛奶／`/effect clear` 提前拿掉都随它一起停，不靠固定时长的 keep。
     */
    const bubbleLingerMark = "world_combat:move_bubble/linger_mark";

    function bubbleLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, bubbleEffect);
        if (carrier === null) { effect.end(); return; }
        const state = JSON.parse(effect.state() || "{}");
        const density = typeof state.density === "number" && state.density > 0 ? Math.round(state.density) : 7;
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "suds", bubbleScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()), density: density });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(bubbleLingerMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid bubble linger mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(bubbleLingerMark, "start", bubbleLingerWatch);
    WorldCombat.effectHandler(bubbleLingerMark, "watch", bubbleLingerWatch);
    WorldCombat.effectHandler(bubbleLingerMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 状态被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_bubble/linger-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== bubbleEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, bubbleLingerMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: bubbleId,
        cooldownParameter: "recharge",
        name: "Bubble",
        description: "一口气吹出无数泡泡，沿瞄准方向张开一个扇形铺出去：身前一大片里的敌人各挨一记轻伤害，有概率被打滑、掉速度；速度快的个体多吹一轮。同一波里多粒泡打到同一人只结算一次，撞墙的泡各自破掉。密泡式泡更多更黏更软，急泡式更快更远。",
        uses: ["起手极短、PP 省，缠斗里反复吹", "一次打到身前扇形里的好几个敌人", "把跑得快的对手打滑，压它速度"],
        kind: "aim",
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
            const intensity = Math.max(0.5, Math.min(2.2, power / 40));
            const scenes = WorldFeedback.actionScenes(bubbleScene);
            // 去重按「波次 + 目标」：同一波里多粒泡打到同一人只结算一次，不跨波误删。
            const hitOnce: { [key: string]: boolean } = {};
            let fired = 0, inFlight = 0, hits = 0, settled = false;

            function complete(current: CombatAction): void {
                inFlight--;
                if (settled || fired < volleys || inFlight > 0) return;
                settled = true;
                if (hits === 0)
                    WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.9, 0)),
                        bubbleMissText, [], 22);
                scenes.finish(current, done);
            }

            function onHit(current: CombatAction, hit: CombatImpact, volley: number): void {
                const scope = current.world();
                const victim = hit.target();
                const point = hit.position();
                if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                    // 撞墙或碰到友方：这一粒泡自己破掉。
                    WorldFeedback.emit(scope, bubbleScene, 1, point,
                        { moment: "pop", bubbles: Math.round(bubbles * 0.35), intensity: intensity }, 16);
                    return;
                }
                const key = volley + ":" + String(victim.ref());
                if (hitOnce[key]) {
                    WorldFeedback.emit(scope, bubbleScene, 1, point,
                        { moment: "pop", target: String(victim.ref()), bubbles: Math.round(bubbles * 0.35), intensity: intensity }, 16);
                    return;
                }
                hitOnce[key] = true;
                if (!impact(current, hit, bubbleId, power, { damage: damageSpec(bubbleId, "spray") })) return;
                hits++;
                let sudsed = false;
                if (scope.valid(victim) && scope.random() < chance) {
                    sudsed = true;
                    NativeEffects.boost(scope, victim, "spe", -stages);
                    MobEffects.apply(scope, victim, bubbleEffect, suds, 0);
                    if (scope.effects(victim, bubbleLingerMark).length === 0)
                        scope.effect(bubbleLingerMark, victim,
                            JSON.stringify({ density: Math.max(4, Math.min(10, Math.round(bubbles / 8))) }),
                            Math.max(1, Math.min(2400, suds)));
                }
                WorldFeedback.emit(scope, bubbleScene, 1, point,
                    { moment: "target", target: String(victim.ref()), bubbles: bubbles, intensity: intensity }, 22);
                if (sudsed)
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), bubbleSudsText, [stages], 30);
            }

            function fire(current: CombatAction): void {
                const scope = current.world();
                const volley = fired;
                const body = scope.observe(current.actor());
                const from = body === null ? current.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0));
                const heading = bubbleAim(current, from);
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
                        impact: function (inner: CombatAction, hit: CombatImpact) { onHit(inner, hit, volley); }
                    }, complete);
                }
                fired++;
                scenes.show(current, "fan", from,
                    { moment: "fan", path: bubbleFan(from, heading, reach, span), bubbles: bubbles, intensity: intensity });
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
}
