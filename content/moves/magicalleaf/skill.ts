/**
 * 魔法叶 / magicalleaf 的出手方式。
 *
 * 核心念头：一片接一片把会拐弯的叶从身前发出去。每一片都用发出那一刻的准线重新找目标——
 *   沿准线锁定第一个合法可见的敌人，有限度地拐弯追上去；没锁到就沿准线直飞。
 *   已发出的叶不会改追别人；按住技能键可以边发边改准线，把叶分给不同方向的多个目标。
 *
 * 幕：
 *   起（gather，提交前）：叶在身周旋起、越聚越多（叶数按本招算出的实际片数）。
 *   放（逐片 fire → seek → hit/block/fade）：每 `beat` 刻发一片，各自独立追踪、独立结算。
 *   收：未发出的叶不再生成，已发出的叶随动作归属清理。
 *
 * 与同族分开：高速星星一次批量分配、一颗星一个对手后离手；群魔乱舞整轮固定同体分摊总威力；
 *   魔法叶的每一片有独立份额，并在发出时按当刻准线重新分配，可顺次扫过多个移动目标。
 */
namespace PokemonSkills {
    const magicalleafScene = "world_combat:move_magicalleaf";

    /** 当刻持续控制的瞄点；没有新输入（AI 提交或未引导）时为 null。 */
    function magicalleafControlPoint(action: CombatAction): CombatPoint | null {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
        } catch (error) { }
        return null;
    }

    /** 无持续控制输入时的回退瞄点：动作选点，取不到就用身体正前方。 */
    function magicalleafAim(action: CombatAction): CombatPoint {
        try { return action.targetPosition(); } catch (error) { }
        return action.origin().plus(WorldCombat.point(0, 0, 1));
    }

    /** 沿当刻准线取第一个合法可见的敌人；判定射线与叶的初始方向共用同一端点。 */
    function magicalleafLock(action: CombatAction, origin: CombatPoint, direction: CombatPoint,
                             range: number, radius: number): CombatActor | null {
        // 默认忽略友体，与本招原生叶片的 hitAllies:false 完全一致；墙和首个敌体由原生 trace 决定。
        const hit = action.trace(origin, origin.plus(direction.scale(Math.max(.5, range))), Math.max(.05, radius), false);
        const scope = action.world(), actor = hit.target();
        if (!hit.hitEntity() || actor === null || !scope.valid(actor) || scope.friendly(actor)) return null;
        const body = scope.observe(actor);
        return body !== null && body.visible() ? actor : null;
    }

    define({
        id: "magicalleaf",
        cooldownParameter: "recharge",
        name: "Magical Leaf",
        description: "一片接一片发出会拐弯的叶：每片都用发出那一刻的准线重新找目标，沿准线锁定第一个合法可见的敌人后有限度地拐弯追上去，没锁到就沿准线直飞。已发出的叶不会改追别人；按住技能键可边发边改准线，把叶分给不同方向的多个目标。",
        uses: ["把连发的叶分给不同方向的移动敌人", "咬住沿准线露出的第一个敌人", "在开阔的持续输出窗口里逐片压上去"],
        kind: "aim",
        range: 11,
        maxRange: 16,
        prepare: 8,
        active: 40,
        recover: 8,
        cooldown: 80,
        maximumTicks: 300,
        style: "leaf",
        defaults: { ai: { maxChase: 15, trackMovers: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("magicalleaf", "lockRange", pokemon), geometry: "area", style: "leaf", color: 0x7FD34A, label: "魔法叶" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["magicalleaf"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("magicalleaf", "tempo", context)),
                recover: Math.round(p("magicalleaf", "settle", context)),
                cooldown: Math.round(p("magicalleaf", "recharge", context)),
                active: skills["magicalleaf"].active,
                range: p("magicalleaf", "lockRange", context)
            };
        },
        windup: function (action, config, prepare) {
            const count = Math.max(1, Math.round(p("magicalleaf", "leaves", action)));
            action.present("magicalleaf:gather", magicalleafScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, count: count }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const count = Math.max(1, Math.round(p("magicalleaf", "leaves", action)));
            const power = p("magicalleaf", "leaf", action);
            const speed = Math.max(0.4, p("magicalleaf", "leafSpeed", action));
            const turn = p("magicalleaf", "turn", action);
            const radius = p("magicalleaf", "leafRadius", action);
            const range = p("magicalleaf", "lockRange", action);
            const gap = Math.max(2, Math.round(p("magicalleaf", "beat", action)));
            const intensity = Math.max(0.5, Math.min(2, power / 26));
            const trail = Math.max(16, Math.round(power * 1.5));
            const notes = Math.max(6, Math.round(power / 4));
            const scale = radius / 0.3;
            const self = String(action.actor().ref());
            const scenes = WorldFeedback.actionScenes(magicalleafScene);
            let fired = 0, active = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled || fired < count || active > 0) return;
                settled = true;
                scenes.finish(current, done);
            }
            function release(current: CombatAction): void { active--; finish(current); }

            /** 发一片叶：方向读当刻准线，沿准线取第一个合法可见敌人作为这一片唯一的有限追踪目标。 */
            function shoot(current: CombatAction): void {
                if (settled) return;
                if (fired >= count) { finish(current); return; }
                const scope = current.world();
                const body = scope.observe(action.actor());
                const origin = body !== null ? body.position() : current.origin();
                const index = fired + 1;
                fired++;
                const control = magicalleafControlPoint(current);
                const aimed = control !== null ? control : magicalleafAim(current);
                let direction = aimed.minus(origin);
                if (direction.length() < 0.05) direction = current.direction();
                direction = direction.unit();
                const locked = magicalleafLock(current, origin, direction, range, radius);
                const ref = locked !== null ? String(locked.ref()) : "";
                const launch = origin;
                let resolved = false, closed = false;
                const key = "leaf-" + index;
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: "cobblemon:particle/generic/grass/leaf", glow: true, tint: 0xBFE6A0 };
                if (ref !== "") appearance.homing = { target: ref, turn: turn, delay: 1, range: range + 8 };
                active++;
                const flight = LivingActions.projectile(current, {
                    origin: launch, speed: speed, range: range + 8, radius: radius, direction: direction,
                    lifetime: Math.max(30, Math.round((range + 8) / speed + 20)),
                    appearance: appearance,
                    impact: function (inner: CombatAction, hit: CombatImpact) {
                        resolved = true;
                        scenes.stop(inner, key); scenes.stop(inner, key + "-seek");
                        const stage = inner.world(), who = hit.target(), at = hit.position();
                        if (who !== null && stage.valid(who) && !stage.friendly(who)) {
                            const landed = impact(inner, hit, "magicalleaf", power,
                                { damage: damageSpec("magicalleaf", "leaf") }, "leaf" + index);
                            WorldFeedback.emit(stage, magicalleafScene, 1, at,
                                { moment: landed ? "hit" : "fade", target: String(who.ref()), intensity: intensity,
                                    notes: notes, scale: scale }, 22);
                            if (landed) stage.sound("cobblemon:impact.grass", at, 12, "{}");
                        } else if (hit.blocked()) {
                            WorldFeedback.emit(stage, magicalleafScene, 1, at,
                                { moment: "block", notes: notes, scale: scale, intensity: intensity }, 18);
                            stage.sound("minecraft:block.grass.break", at, 8, "{}");
                        } else {
                            WorldFeedback.emit(stage, magicalleafScene, 1, at,
                                { moment: "fade", intensity: intensity }, 18);
                        }
                        if (!closed) { closed = true; release(inner); }
                    }
                }, function (inner: CombatAction) {
                    if (!resolved) {
                        scenes.stop(inner, key); scenes.stop(inner, key + "-seek");
                        // 空飞的真实末点：读该弹完成回调内仍有效的最后位置，不拿旧瞄准点或满射程点假造终点。
                        const end = inner.world().projectilePosition(flight);
                        if (end !== null)
                            WorldFeedback.emit(inner.world(), magicalleafScene, 1, end,
                                { moment: "fade", intensity: intensity }, 18);
                    }
                    if (!closed) { closed = true; release(inner); }
                });
                scenes.show(current, key, origin,
                    { moment: "fire", direction: [direction.x(), direction.y(), direction.z()],
                        index: index, count: count, locked: ref !== "" ? 1 : 0, intensity: intensity, scale: scale });
                scenes.show(current, key + "-seek", origin,
                    { moment: "seek", projectile: flight, trail: trail, intensity: intensity, scale: scale });
                sound(current, "minecraft:entity.arrow.shoot");
                if (fired < count) current.after(gap, shoot);
                else finish(current);
            }

            sound(action, "cobblemon:move.magicalleaf.actor_1");
            shoot(action);
        }
    });

    // 玩家按住技能键可边发边改准线；AI 提交仍带一个目标点，读同一条控制输入。
    WorldCombat.preview("world_combat:magicalleaf", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
