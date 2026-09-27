/**
 * 强力鞭打 / powerwhip 的出手方式。
 *
 * 核心念头：把青藤或触手盘起、探高，再激烈地甩出一道横扫——**有限鞭段从身前顺次扫过长弧或全周**，
 * 鞭尖扫过的那一块就是被打到的范围，站在里面的人和物一起挨这一记，被推得散开。它是本族里**够得最远、
 * 覆盖最宽**的一招：起手重、冷却久，但一道弧面就能把身前一片清干净。
 *
 * 两幕（提交前只播预告）：
 *   起（coil）：青藤自脚边盘成几圈、叶屑向臂弯收拢，只播预告；由自定义场景画出真实缠起的藤身。
 *   扫（sweep → hit / miss）：提交后鞭尖按 `segments` 段逐刻扫过：每段取真实的两个端点，先看这段径向
 *       是否撞墙（`WorldGeometry.blockHit`），撞墙就把鞭尖截在墙面、这段扫不到墙后；再以本段扫过的楔形
 *       （`WorldGeometry.bodyPolygon`）做真实实体箱碰撞，`maxTargets` 之内每个目标只结算一次 `lash`
 *       接触伤害，并按各自实际质量推开 shove 格。逐段用 `actionScenes` 上传当前真实鞭身与扫过轨迹，
 *       判定与表现共用同一组端点；一段都没扫到才算落空。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体，也可只给方向或世界点原地解围、空甩；墙外扫不到，攻击许可仍由命中层决定。
 *
 * 与同族分开：藤鞭是短而快的单线一抽、缠绕是贴身绞缠减速、百万吨重踢是直线单体踢飞；
 * 强力鞭打凭「一道远而宽的横扫弧面」认出来。配置 extend 由 resolve 改射程、由公式改弧度与威力。
 * 提交后才触碰世界。
 */
namespace PokemonSkills {
    const powerwhipScene = "world_combat:move_powerwhip";
    /** 逐段扫过的藤身由自定义场景绘制，与命中/落空的粒子分开注册。 */
    const powerwhipVineScene = "world_combat:move_powerwhip_vine";
    /** 起手盘藤同样用自定义场景画出真实缠起的圈。 */
    const powerwhipCoilScene = "world_combat:move_powerwhip_coil";
    const powerwhipHitText = "world_combat.move.powerwhip.text.hit";
    const powerwhipMissText = "world_combat.move.powerwhip.text.miss";

    /** 把方向绕 Y 轴转 `degrees`，保持水平单位向量；判定与表现共用。 */
    function powerwhipRotate(heading: CombatPoint, degrees: number): CombatPoint {
        const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(heading.x() * cos - heading.z() * sin, 0, heading.x() * sin + heading.z() * cos);
    }

    define({
        id: "powerwhip",
        cooldownParameter: "recharge",
        name: "Power Whip",
        description: "把青藤或触手盘起探高，再激烈地甩出一道横扫：鞭尖从身前顺次扫过长弧或整圈，扫过的那一块就是被打到的范围，站在里面的敌人一起挨这一记并被推开。可点任意目标，也可只朝一个方向原地解围、空甩；墙外扫不到。",
        uses: ["一道横扫清空身前一片", "隔着中距离先手扫开成群的对手", "被围住时原地整圈甩开"],
        kind: "aim",
        range: 4.7,
        maxRange: 6.8,
        prepare: 14,
        active: 22,
        recover: 12,
        cooldown: 42,
        style: "lash",
        defaults: { extend: true, ai: { maxChase: 9, preferGroups: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("powerwhip", "reach", pokemon), geometry: "area", style: "lash",
                color: 0x6FA83C, label: config && config.extend === false ? "强力鞭打·旋身式" : "强力鞭打" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["powerwhip"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const extend = !(config && config.extend === false);
            return {
                prepare: Math.round(p("powerwhip", "tempo", context)),
                recover: Math.round(p("powerwhip", "aftercast", context)),
                cooldown: Math.round(p("powerwhip", "recharge", context)),
                active: skills["powerwhip"].active,
                range: p("powerwhip", "reach", context) + (extend ? 0.4 : 0.2)
            };
        },
        windup: function (action, config, prepare) {
            const direction = WorldGeometry.basis(aim(action), action.direction()).forward;
            action.present("world_combat:move_powerwhip:coil", powerwhipCoilScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", extend: config && config.extend === false ? 0 : 1, windup: prepare,
                    start: action.sense().tick(), direction: [direction.x(), direction.y(), direction.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            const start = action.origin();
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const reach = Math.max(2.4, p("powerwhip", "reach", action));
            const arc = Math.max(60, Math.min(360, p("powerwhip", "arc", action)));
            const power = p("powerwhip", "lash", action);
            const leaves = Math.max(10, Math.round(p("powerwhip", "leaves", action)));
            const maxTargets = Math.max(1, Math.round(p("powerwhip", "maxTargets", action)));
            const extend = !(config && config.extend === false);
            const ring = arc >= 350;
            const scale = Math.max(0.6, Math.min(2.4, reach / 4.6));
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            // 有限鞭段：逐刻只扫一段，扫长弧或整圈；判定与表现共用这一段的两端点。
            const segments = ring ? 18 : 14;
            const lashY = start.y() + 0.55;
            const firstAngle = ring ? 0 : -arc / 2;
            const frontier: number[][] = [[start.x(), lashY, start.z()]];
            const hitRefs: { [ref: string]: boolean } = Object.create(null);
            const scenes = WorldFeedback.actionScenes(powerwhipVineScene);
            let index = 0, hits = 0, settled = false;

            sound(action, extend ? "cobblemon:move.razorleaf.actor_1" : "minecraft:entity.player.attack.sweep");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? start : body.position();
                if (hits === 0) {
                    WorldFeedback.emit(scope, powerwhipScene, 1, at.plus(direction.scale(Math.min(reach * 0.7, 3.5))),
                        { moment: "miss", leaves: Math.round(leaves * 0.6), scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), powerwhipMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.weak");
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), powerwhipHitText, [hits], 22);
                    sound(current, "cobblemon:impact.grass");
                }
                scenes.finish(current, done);
            }

            function sweep(current: CombatAction): void {
                if (settled) return;
                if (index >= segments) { finish(current); return; }
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const pivot = WorldCombat.point(body.position().x(), lashY, body.position().z());
                const before = firstAngle + (arc * index) / segments;
                const after = firstAngle + (arc * (index + 1)) / segments;
                const rawTo = pivot.plus(powerwhipRotate(direction, after).scale(reach));
                // 墙截断鞭路：本段径向撞墙就把鞭尖停在真实墙面，判定同样到墙为止。
                const wall = WorldGeometry.blockHit(scope, pivot, rawTo);
                const tip = wall === null ? rawTo : wall.position();
                const span = Math.max(0.2, pivot.minus(tip).length());
                const near = pivot.plus(powerwhipRotate(direction, before).scale(span));
                frontier.push([tip.x(), tip.y(), tip.z()]);
                // 判定与表现共用 [pivot, near, tip] 这组端点：本段扫过的楔形，真实实体箱碰撞。
                const wedge = WorldGeometry.bodyPolygon([pivot, near, tip], lashY - 1.0, lashY + 1.9);
                WorldGeometry.selectBodies(scope, wedge, function (target, facts) {
                    const ref = String(target.ref());
                    if (ref === String(actor.ref()) || hitRefs[ref] || facts.friendly() || hits >= maxTargets) return;
                    if (!scope.clear(pivot, facts.position())) return;
                    if (!hurt(current, target, "powerwhip", power, { damage: damageSpec("powerwhip", "lash"), contact: true })) return;
                    hitRefs[ref] = true;
                    hits++;
                    if (scope.valid(target)) {
                        // 推距按每个受击者自己的实际质量求值，而不是全场取一次。
                        const shove = Math.max(0.05, p("powerwhip", "shove", withTarget(factContext(current), target)));
                        const away = facts.position().minus(pivot);
                        scope.hitDisplace(target, (away.length() < 0.05 ? direction : away).unit().scale(shove));
                    }
                    WorldFeedback.emit(scope, powerwhipScene, 1, facts.position(),
                        { moment: "hit", target: ref, leaves: leaves, scale: scale, intensity: intensity }, 24);
                });
                scenes.show(current, "sweep", pivot,
                    { moment: "sweep", path: frontier, near: [near.x(), near.y(), near.z()], tip: [tip.x(), tip.y(), tip.z()],
                        direction: [direction.x(), direction.y(), direction.z()], reach: span, leaves: leaves,
                        scale: scale, intensity: intensity, ring: ring ? 1 : 0, progress: (index + 1) / segments });
                index++;
                if (index >= segments) { finish(current); return; }
                current.after(1, function (next: CombatAction) { sweep(next); });
            }

            sweep(action);
        }
    });
}
