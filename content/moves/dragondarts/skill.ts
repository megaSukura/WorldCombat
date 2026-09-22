/**
 * 龙箭 / dragondarts —— 注册与动作。
 *
 * 核心念头：一次放出**两支会自己追人的龙箭**，并让它们在目标之间分配：场上有两只敌人时各追一只
 *   （分头式），只有一只时两箭都扎在同一只身上（集火式，每支更重）。分配目标而不是随机溅射，
 *   是它和双针（两针同靶、第二针吃伤口）、鼠数儿（同伴随机连段）最明显的区别。
 *
 * 幕：
 *   起（windup，提交前）：身侧聚起两团龙气的预告（`action.present`，可被打断、不花 PP）。
 *   射（first → second）：提交后先放第一支，落定/飞完后隔 `gap` 放第二支；每支带追踪（`homing`）飞向
 *     分配给它的目标，命中结算一次 `dart` 物理伤害。
 *   收：两箭各自结算完毕才收招；目标在两箭之间倒下时不再补放。
 *
 * 配置 `volley`（分头式）由公式改每支威力、由 execute 决定目标分配：开启＝有两只时各追一只；
 *   关闭（集火式）＝两箭都追选定目标、每支 ×1.2。
 */
namespace PokemonSkills {
    const dragondartsScene = "world_combat:move_dragondarts";
    const dragondartsMissText = "world_combat.move.dragondarts.text.miss";

    /** 水平侧向单位向量：把两支箭摊到身体两侧；方向接近竖直时退化为世界 X 轴。 */
    function dragondartsSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: "dragondarts",
        name: "Dragon Darts",
        description: "一次放出两支会追踪的龙箭：场上有两只敌人时各追一只（分头式），只有一只时两箭都扎在同一只身上、每支更重（集火式）。",
        uses: ["同时照顾两只分散的敌人", "用追踪箭咬住走位中的目标", "把两支压在一个目标上打爆发"],
        kind: "enemy",
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
                JSON.stringify({ moment: "aim", volley: config && config.volley === true }));
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
            const primary = action.target();
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

            // 目标分配：先收拢射程内的非友方，把它作为第一支的目标，再按站位挑第二只。
            const pool: string[] = [];
            if (primary !== null && world.valid(primary) && !world.friendly(primary) && String(primary.ref()) !== String(actor.ref()))
                pool.push(String(primary.ref()));
            const nearby = world.query(body.position(), reach, false);
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (!world.valid(other) || world.friendly(other) || String(other.ref()) === String(actor.ref())) continue;
                const ref = String(other.ref());
                if (pool.indexOf(ref) < 0) pool.push(ref);
            }
            const assignments: string[] = [];
            if (!pool.length) {
                WorldFeedback.emit(world, dragondartsScene, 1, action.targetPosition(), { moment: "miss" }, 16);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 1, 0)), dragondartsMissText, [], 22);
                done(action); return;
            }
            assignments.push(pool[0]);
            if (darts >= 2) assignments.push(split && pool.length >= 2 ? pool[1] : pool[0]);

            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function next(current: CombatAction, i: number): void {
                if (i + 1 >= assignments.length) {
                    WorldFeedback.emit(current.world(), dragondartsScene, 1, current.targetPosition(), { moment: "done", motes: motes }, 16);
                    finish(current);
                    return;
                }
                current.after(gap, function (inner: CombatAction) { launch(inner, i + 1, assignments[i + 1]); });
            }

            function launch(current: CombatAction, i: number, victimRef: string): void {
                const scope = current.world();
                const selfBody = scope.observe(current.actor());
                const victim = scope.actor(victimRef);
                if (selfBody === null || victim === null || !scope.valid(victim)) { next(current, i); return; }
                const victimBody = scope.observe(victim);
                if (victimBody === null) { next(current, i); return; }
                const side = dragondartsSide(aim(current));
                const origin = selfBody.position().plus(side.scale(i === 0 ? spread : -spread)).plus(WorldCombat.point(0, i * 0.12, 0));
                const delta = victimBody.position().minus(origin);
                const heading = delta.length() < 0.05 ? aim(current) : delta.unit();
                const appearance: any = { sprite: "cobblemon:generic/orb/energyorb", tint: 0x7C6BE8, glow: true, scale: 0.9,
                    homing: { target: victimRef, turn: turn, range: current.range() } };
                sound(current, "minecraft:entity.ender_dragon.flap");
                WorldFeedback.emit(scope, dragondartsScene, 1, origin,
                    { moment: i === 0 ? "first" : "second", index: i + 1, motes: motes, scale: 0.9,
                        direction: [heading.x(), heading.y(), heading.z()], intensity: intensity }, 20);
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: current.range(), radius: 0.2, direction: heading, appearance: appearance,
                    impact: function (inner: CombatAction, hit: CombatImpact, age: number) {
                        const innerWorld = inner.world();
                        const struck = hit.target();
                        if (struck === null || !innerWorld.valid(struck) || innerWorld.friendly(struck)) return;
                        const landed = impact(inner, hit, "dragondarts", power, { damage: damageSpec("dragondarts", "dart") });
                        const at = innerWorld.observe(struck);
                        WorldFeedback.emit(innerWorld, dragondartsScene, 1, at === null ? hit.position() : at.position(),
                            { moment: landed ? "strike" : "graze", target: String(struck.ref()), index: i + 1, motes: motes,
                                dart: flight, intensity: intensity }, 22);
                    }
                }, function (inner: CombatAction) { next(inner, i); });
            }

            WorldFeedback.emit(world, dragondartsScene, 1, body.position(),
                { moment: "aim", dart: darts, motes: motes, intensity: intensity }, 18);
            launch(action, 0, assignments[0]);
        }
    });
}
