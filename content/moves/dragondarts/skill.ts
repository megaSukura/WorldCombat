/**
 * 龙箭 / dragondarts —— 注册与动作。
 *
 * 核心念头：一次放出**两支会自己追人的龙箭**，并让它们在目标之间分配：场上有两只敌人时各追一只
 *   （分头式），只有一只时两箭都扎在同一只身上（集火式，每支更重）。分配目标而不是随机溅射，
 *   是它和双针（两针同靶、第二针吃伤口）、鼠数儿（同伴随机连段）最明显的区别。
 *
 * 选取：`kind: "aim"`——可指定敌人，也可朝一个方向/世界点发射；手动方向空放不强选近敌。
 *
 * 幕：
 *   起（windup，提交前）：身侧聚起两团龙气的预告（`action.present`，可被打断、不花 PP）。
 *   射（first → second）：提交后先放第一支，飞完/落定后隔 `gap` 放第二支。第一支照提交时的选择：
 *     选中非友方实体就带追踪（`homing`）追它，只选地点/方向就沿该朝向直飞。第二支在**发射那一刻**
 *     才决定：分头式且场上还有另一只活敌就改追第二只，否则原对象还活着就继续追它，都没有就沿最后朝向
 *     射空——固定两箭，不增加箭数、不无限重定向。每支命中结算一次 `dart` 物理伤害，目标在两箭之间
 *     倒下时那支就地掠过（graze）。
 *   收：两箭各自结算完毕才收招。
 *
 * 配置 `volley`（分头式）由公式改每支威力、由 execute 决定第二支的目标分配：开启＝有两只时各追一只；
 *   关闭（集火式）＝两箭都追选定的那一只、每支 ×1.2。
 */
namespace PokemonSkills {
    const dragondartsScene = "world_combat:move_dragondarts";

    /** 水平侧向单位向量：把两支箭摊到身体两侧；方向接近竖直时退化为世界 X 轴。 */
    function dragondartsSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: "dragondarts",
        cooldownParameter: "recharge",
        name: "Dragon Darts",
        description: "一次放出两支会追踪的龙箭：场上有两只敌人时各追一只（分头式），只有一只时两箭都扎在同一只身上、每支更重（集火式）。",
        uses: ["同时照顾两只分散的敌人", "用追踪箭咬住走位中的目标", "把两支压在一个目标上打爆发"],
        kind: "aim",
        range: 9,
        maxRange: 14,
        prepare: 7,
        active: 2,
        recover: 6,
        cooldown: 30,
        style: "darts",
        defaults: { volley: true, ai: { maxChase: 13, finishLow: false, crowd: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragondarts"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragondarts", "tempo", context)),
                recover: Math.round(p("dragondarts", "recover", context)),
                cooldown: Math.round(p("dragondarts", "recharge", context)),
                active: skills["dragondarts"].active,
                range: p("dragondarts", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("dragondarts:aim:" + action.id(), dragondartsScene, 1, action.origin(),
                JSON.stringify({ moment: "aim",
                    dart: Math.max(1, Math.min(2, Math.round(p("dragondarts", "darts", action)))) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: p("dragondarts", "reach", pokemon), geometry: "line", style: "darts", color: 0x7C6BE8,
                label: config && config.volley === true ? "龙箭·分头" : "龙箭·集火" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const selected = action.target();
            const primary = selected !== null && world.valid(selected) && !world.friendly(selected)
                && String(selected.ref()) !== String(actor.ref()) ? selected : null;
            const reach = Math.max(5, p("dragondarts", "reach", action));
            const power = p("dragondarts", "dart", action);
            const darts = Math.max(1, Math.min(2, Math.round(p("dragondarts", "darts", action))));
            const speed = Math.max(0.6, p("dragondarts", "flight", action));
            const gap = Math.max(2, Math.round(p("dragondarts", "gap", action)));
            const spread = Math.max(0, p("dragondarts", "spread", action));
            const turn = Math.max(6, Math.round(p("dragondarts", "turn", action)));
            const motes = Math.max(8, Math.round(p("dragondarts", "motes", action)));
            const split = !!(config && config.volley === true);
            const intensity = Math.max(0.6, Math.min(2, power / 24));
            let lastHeading = aim(action);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 距施法者最近的、活着且不是 excludeRef 的非友方；第二支发射时用它改派。 */
            function secondTarget(scope: CombatWorld, from: CombatPoint, excludeRef: string): CombatActor | null {
                const nearby = scope.query(from, reach, false);
                let best: CombatActor | null = null, bestDistance = Infinity;
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (!scope.valid(other) || scope.friendly(other)) continue;
                    const ref = String(other.ref());
                    if (ref === String(actor.ref()) || ref === excludeRef) continue;
                    const at = scope.observe(other);
                    if (at === null) continue;
                    const d = at.position().minus(from).length();
                    if (d <= reach && d < bestDistance) { bestDistance = d; best = other; }
                }
                return best;
            }

            function next(current: CombatAction, i: number): void {
                if (i + 1 >= darts) {
                    const selfBody = current.world().observe(current.actor());
                    WorldFeedback.emit(current.world(), dragondartsScene, 1,
                        selfBody === null ? current.origin() : selfBody.position(), { moment: "done", motes: motes }, 16);
                    finish(current);
                    return;
                }
                current.after(gap, function (inner: CombatAction) { launch(inner, i + 1); });
            }

            function launch(current: CombatAction, i: number): void {
                const scope = current.world();
                const selfBody = scope.observe(current.actor());
                if (selfBody === null) { next(current, i); return; }
                const from = selfBody.position();
                const primaryRef = primary === null ? "" : String(primary.ref());
                let victim: CombatActor | null = null;
                let endpoint: CombatPoint | null = null;
                let heading = lastHeading;

                if (i === 0) {
                    // 第一支照原选择：选中实体就追它，只选地点/方向就沿那个点直飞。
                    if (primary !== null && scope.valid(primary) && !scope.friendly(primary)) {
                        const primaryBody = scope.observe(primary);
                        if (primaryBody !== null) { victim = primary; endpoint = primaryBody.position(); }
                    }
                    if (victim === null) endpoint = current.targetPosition();
                } else {
                    // 第二支此刻才决定：分头式优先改追另一只活敌；否则原对象还活着就继续追它。
                    if (primary !== null && split) victim = secondTarget(scope, from, primaryRef);
                    if (victim === null && primary !== null && scope.valid(primary) && !scope.friendly(primary)) victim = primary;
                    if (victim !== null) {
                        const at = scope.observe(victim);
                        if (at !== null) endpoint = at.position();
                        else victim = null;
                    }
                }

                if (endpoint !== null) {
                    const delta = endpoint.minus(from);
                    heading = delta.length() < 0.05 ? lastHeading : delta.unit();
                } else {
                    // 没有可追的目标：沿最后朝向射空，不加箭、不再重定向。
                    endpoint = from.plus(lastHeading.scale(reach));
                    heading = lastHeading;
                }
                if (heading.length() < 0.05) heading = aim(current);
                lastHeading = heading;

                const side = dragondartsSide(heading);
                const origin = from.plus(side.scale(i === 0 ? spread : -spread)).plus(WorldCombat.point(0, i * 0.12, 0));
                const aimDelta = endpoint.minus(origin);
                if (aimDelta.length() > 0.05) heading = aimDelta.unit();

                const appearance: any = { sprite: "cobblemon:generic/orb/energyorb", tint: 0x7C6BE8, glow: true, scale: 0.9 };
                const victimRef = victim === null ? "" : String(victim.ref());
                if (victim !== null) appearance.homing = { target: victimRef, turn: turn, delay: 1, range: current.range() + 4 };
                const lifetime = Math.max(40, Math.round(current.range() / Math.max(0.2, speed) + 40));
                const end = origin.plus(heading.scale(current.range()));
                let connected = false;

                const flight = current.projectile(origin, heading.scale(speed), 0, 0.2, current.range(), lifetime,
                    function (inner: CombatAction, hit: CombatImpact) {
                        const innerWorld = inner.world();
                        const struck = hit.target();
                        connected = true;
                        if (struck !== null && innerWorld.valid(struck) && !innerWorld.friendly(struck)) {
                            const landed = impact(inner, hit, "dragondarts", power, { damage: damageSpec("dragondarts", "dart") });
                            const at = innerWorld.observe(struck);
                            WorldFeedback.emit(innerWorld, dragondartsScene, 1, at === null ? hit.position() : at.position(),
                                { moment: landed ? "strike" : "graze", point: LivingActions.coordinates(hit.position()),
                                    target: String(struck.ref()), index: i + 1, motes: motes, intensity: intensity }, 22);
                        } else {
                            // 撞墙或撞到非敌：贴接触点掠过。
                            WorldFeedback.emit(innerWorld, dragondartsScene, 1, hit.position(),
                                { moment: "graze", point: LivingActions.coordinates(hit.position()), index: i + 1, motes: motes, intensity: intensity }, 20);
                        }
                    },
                    function (inner: CombatAction) {
                        if (!connected) {
                            // 飞到尽头没碰到任何东西（目标离场/空放）：在轨迹尽头掠过。
                            WorldFeedback.emit(inner.world(), dragondartsScene, 1, end,
                                { moment: "graze", point: LivingActions.coordinates(end), index: i + 1, motes: motes, intensity: intensity }, 20);
                        }
                        next(inner, i);
                    },
                    JSON.stringify(appearance));

                // 发射线：从真实出箭点画到这一刻要追的落点，两支各奔哪里一眼可读。
                const line: number[][] = [[origin.x(), origin.y(), origin.z()], [endpoint.x(), endpoint.y(), endpoint.z()]];
                sound(current, "minecraft:entity.ender_dragon.flap");
                WorldFeedback.emit(scope, dragondartsScene, 1, origin,
                    { moment: i === 0 ? "first" : "second", index: i + 1, projectile: flight, path: line,
                        motes: motes, scale: 0.9, intensity: intensity }, lifetime + 10);
            }

            WorldFeedback.emit(world, dragondartsScene, 1, body.position(),
                { moment: "aim", dart: darts, motes: motes, intensity: intensity }, 18);
            launch(action, 0);
        }
    });
}
