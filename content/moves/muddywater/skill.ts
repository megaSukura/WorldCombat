/**
 * 浊流 / muddywater 的出手方式。
 *
 * 核心念头：**一道贴着真实地表向前推的浑浊泥浪**。它不快，但很阔：泥水从脚下整片漫出去，一层层扫过身前，
 *   把扇形里所有敌人的视线一起糊住；推完，扫过的地面只留下短泥膜。它区别于同族水招的地方就是这条
 *   「宽而低、单向推进的泥面」——冲浪是整圈水漫、水枪是细线、泡沫光线是黏人的泡沫球。
 *
 * 三幕：
 *   起（windup，提交前）：口边与脚边涌起一圈浑水、泥泡向内收，只播预告（可被打断）。
 *   漫（surge → hit）：提交后锁定起点与方向，泥浪沿真实地表（共享 SurfacePaths 的原生顶面采样与抬升/跨步/落步走廊）
 *       按 `sweep` 步向 `reach` 推进；断口、高墙或过陡台阶让它提前停下，不会悬空继续铺。每一步只取实际走到的地表
 *       作判定与画面，扫过一道扇环，环内每个非友方（最多 `maxTargets` 个）各吃一次 `surge`，且必须与浪根通视——
 *       挡住的片段到不了目标。有 `murkChance` 概率掉 `murkStages` 级命中并带上共享身份 `world_combat:status/murky`；
 *       只有真正降了命中才播提示；横移或退远可以躲开后段。
 *   淤（silt / miss）：浪推完，扫过的地面只留下 `siltTicks` 之内的短泥膜粒子，到期自然散去；
 *       一个人都没扫到、或脚下没有可供推进的真实地表时播一个空浪。
 *
 * 与同族分开：唯一一条**贴地、单向、按步推进的宽泥浪**；画面上是低矮的褐色水墙向前抹，不是整圈、不是细线、
 *   不是会浮起的泡。选取是 `kind: "aim"`——方向或世界点都能放，目标为 null 时沿当前朝向照常推浪。
 *   命中下降只落共享能力等级（NativeEffects.boost 的 accuracy）与原生命中等级；MobEffect 只带共享身份
 *   （murky + 伞身份 aim_impaired），不额外承诺攻击削弱。
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
        const half = (degrees * Math.PI / 180) / 2, steps = 10;
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

    /** 沿真实地表推进的路径在 `distance` 处的顶面高度；路径不足时用最后一点，无路径时用 fallback。 */
    function muddywaterGroundY(path: CombatPoint[], distance: number, fallback: number): number {
        let travelled = 0;
        for (let i = 1; i < path.length; i++) {
            const leg = path[i].minus(path[i - 1]).length();
            if (travelled + leg >= distance) {
                const t = leg < 1e-6 ? 0 : (distance - travelled) / leg;
                return path[i - 1].y() + (path[i].y() - path[i - 1].y()) * t;
            }
            travelled += leg;
        }
        return path.length ? path[path.length - 1].y() : fallback;
    }

    /** 泥浪沿真实地表能推到多远；断口、高墙或过陡台阶让共享 SurfacePaths 提前结束。 */
    function muddywaterTravel(world: CombatWorld, from: CombatPoint, heading: CombatPoint, distance: number): SurfacePaths.Step {
        const spacing = 0.5;
        return SurfacePaths.advance(world, from, heading, distance,
            { up: 1.2, down: 2.5, spacing: spacing, samples: Math.max(8, Math.ceil(distance / spacing) + 2) });
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
        description: "从脚下向前推出一道贴着真实地表的浑浊泥浪：泥水一层层漫过身前大片，扇形里的敌人各挨一记，有概率被泥水糊住眼睛、掉命中；地表断开、越过高墙或台阶太陡时泥浪就停在上一段，不会悬空继续铺，横移或退远能躲开后段。推完地面只留下一层短泥膜。淤积式铺得更宽更久更黏，急流式更重更快更远。",
        uses: ["一次糊住身前扇形里的一排敌人", "削掉对手的命中，为对手的下一轮攻击留出空门", "沿地面推进，隔着一道矮坡打到正对着的那排敌人"],
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
            const release = body === null ? action.origin() : body.position();
            // 贴地：起点投到脚下的真实地表；x/z 保持施法者位置，把整道浪钉在它自身所在的平面上。
            const snapped = WorldGeometry.ground(world, release, 6);
            const origin = WorldCombat.point(release.x(), snapped.y(), release.z());
            const heading = muddywaterHeading(aim(action));
            const power = p(muddywaterId, "surge", action);
            const budgetReach = Math.max(4, p(muddywaterId, "reach", action));
            const span = Math.max(35, p(muddywaterId, "span", action));
            const steps = Math.max(3, Math.round(p(muddywaterId, "sweep", action)));
            const stages = Math.max(1, Math.min(2, Math.round(p(muddywaterId, "murkStages", action))));
            const chance = Math.max(0.05, Math.min(0.85, p(muddywaterId, "murkChance", action)));
            const murk = Math.max(40, Math.round(p(muddywaterId, "murkTicks", action)));
            const cap = Math.max(1, Math.round(p(muddywaterId, "maxTargets", action)));
            const drops = Math.max(10, Math.round(p(muddywaterId, "drops", action)));
            const flow = Math.max(48, Math.round(drops * 5));
            const filmTicks = Math.max(12, Math.round(p(muddywaterId, "siltTicks", action)));
            const scale = Math.max(0.5, Math.min(2.2, budgetReach / 11));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            const scenes = WorldFeedback.actionScenes(muddywaterScene);
            const band: WorldGeometry.Band = { below: 1.2, above: 1.8 };
            // 整道浪沿真实地表推进：断口/高墙前就停，实际走得多少用多少。
            const walk = muddywaterTravel(world, origin, heading, budgetReach);
            const supported = walk.path.length >= 2;
            const total = supported ? Math.max(0.5, Math.min(budgetReach, walk.travelled)) : 0;
            const path = walk.path.length ? walk.path : [origin];
            const struck: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, settled = false;

            function bandAt(distance: number): CombatPoint {
                return WorldCombat.point(origin.x(), muddywaterGroundY(path, distance, origin.y()), origin.z());
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                // 独立余波：短泥膜只按自己的寿命停留，不替换任何方块，且只铺在真实扫过的地面上。
                const filmOrigin = supported ? bandAt(total) : origin;
                const film = Math.max(6, Math.round(drops * 0.5));
                WorldFeedback.emit(scope, muddywaterScene, 1, filmOrigin,
                    { moment: hits > 0 ? "silt" : "miss", film: film, drops: drops, flow: flow, scale: scale,
                        path: muddywaterBand(filmOrigin, heading, 0, total, span) }, filmTicks);
                if (hits === 0)
                    WorldFeedback.text(scope, filmOrigin.plus(WorldCombat.point(0, 0.9, 0)), muddywaterMissText, [], 24);
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                if (!supported) { finish(current); return; }
                const scope = current.world();
                const outer = Math.min(total, total * (step + 1) / steps), inner = Math.max(0, total * step / steps - 0.35);
                const front = bandAt(outer);
                const wedge = WorldGeometry.sector(front, heading, outer, span, band);
                const annulus = WorldGeometry.ring(front, inner, outer, band);
                const region: WorldGeometry.Region = {
                    contains: function (point) { return wedge.contains(point) && annulus.contains(point); },
                    centre: function () { return front; },
                    radius: function () { return annulus.radius(); }
                };
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref()) || struck[ref] || hits >= cap) return;
                    // 障碍逐段裁切：被挡住的切片不再往后铺，目标也吃不到这一记。
                    if (!scope.clear(origin.plus(WorldCombat.point(0, 0.1, 0)), facts.position())) return;
                    struck[ref] = true;
                    if (!hurt(current, enemy, muddywaterId, power, { damage: damageSpec(muddywaterId, "surge") })) return;
                    hits++;
                    let dropped = 0;
                    if (scope.valid(enemy) && scope.random() < chance) {
                        // 只按实际降下的命中等级落状态与提示；被原生拒绝时不发成功提示。
                        dropped = NativeEffects.boost(scope, enemy, "accuracy", -stages);
                        if (dropped !== 0) {
                            MobEffects.apply(scope, enemy, muddywaterEffect, murk, 0);
                            if (scope.effects(enemy, muddywaterLingerMark).length === 0)
                                scope.effect(muddywaterLingerMark, enemy,
                                    JSON.stringify({ density: Math.max(4, Math.min(10, Math.round(drops / 6))) }),
                                    Math.max(1, Math.min(2400, murk)));
                        }
                    }
                    WorldFeedback.emit(scope, muddywaterScene, 1, facts.position(),
                        { moment: "hit", target: ref, drops: drops, flow: flow, intensity: intensity }, 26);
                    if (dropped !== 0)
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), muddywaterMurkText, [Math.abs(dropped)], 32);
                });
                scenes.show(current, "front", front,
                    { moment: "surge", path: muddywaterBand(front, heading, inner, outer, span), drops: drops, flow: flow,
                        scale: scale, intensity: intensity });
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.waterpulse.actor");
            scenes.show(action, "front", origin,
                { moment: "surge", path: muddywaterBand(origin, heading, 0, 0.6, span), drops: drops, flow: flow,
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
