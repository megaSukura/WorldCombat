/**
 * 喷射火焰 / flamethrower 的出手方式。
 *
 * 核心念头：攒一口气，向前喷出一道会自己变长的火舌——火舌逐刻向远处铺，沿一条走廊燎过，
 * 站在里面的人各挨一记并被点燃；火舌扫到最长才收。它是有意做成「持续」的一招：玩家看得见火墙
 * 一截一截推出去，也知道站在哪一截会挨烧。
 *
 * 三幕：
 *   起（charge，提交前）：喉间与身前聚火，白热的核心亮起，只播预告。
 *   喷（jet → hit，提交后）：火舌每刻向远处推进一截，覆盖同一道走廊（集束式）或同一个扇面（扇面式）；
 *       新进入的敌人各结算一次 jet 伤害并按概率引燃；画面读得出火舌现在到了第几格。
 *   收（fade）：火舌喷完，余焰与烟慢慢散去。
 *
 * 与同族分开：火花是一粒点、大字爆炎是一幅字、神圣之火是一次俯冲；只有喷射火焰是持续变长的一道墙。
 * 配置 `wide`（扇面式）由 resolve 改时序、由公式改威力／长度／张角，提交后才触碰世界。
 */
namespace PokemonSkills {
    const flamethrowerScene = "world_combat:move_flamethrower";
    const flamethrowerBurnText = "world_combat.move.flamethrower.text.burn";
    const flamethrowerHitText = "world_combat.move.flamethrower.text.hit";

    function flamethrowerVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 扇面轮廓：火舌顶点 + 沿弧排开的外缘点；表现与判定读同一个水平圆心角。 */
    function flamethrowerFan(origin: CombatPoint, direction: CombatPoint, length: number, degrees: number, steps: number): number[][] {
        const half = degrees * Math.PI / 360, base = Math.atan2(direction.z(), direction.x());
        const vertices: number[][] = [flamethrowerVertex(origin)];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * i / steps;
            vertices.push(flamethrowerVertex(origin.plus(WorldCombat.point(Math.cos(angle) * length, 0, Math.sin(angle) * length))));
        }
        return vertices;
    }

    define({
        id: "flamethrower",
        cooldownParameter: "recharge",
        name: "Flamethrower",
        description: "The target is scorched with an intense blast of fire. This may also leave the target with a burn.",
        uses: ["向前喷出一道持续变长的火舌", "一次燎过挤在一条走廊里的对手", "用扇面封住身前一片，逼对手绕开"],
        kind: "enemy",
        range: 10,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "flame",
        stationary: true,
        defaults: { wide: false, ai: { maxChase: 13, preferClusters: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flamethrower", "reach", pokemon), geometry: "line", style: "flame",
                color: 0xFF7A2E, label: config && config.wide === true ? "扇面喷射火焰" : "集束喷射火焰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flamethrower"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("flamethrower", "tempo", context)),
                recover: Math.round(p("flamethrower", "aftercast", context)),
                cooldown: Math.round(p("flamethrower", "recharge", context)),
                active: 0,
                range: p("flamethrower", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("flamethrower:charge", flamethrowerScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const wide = !!(config && config.wide);
            const power = p("flamethrower", "jet", action);
            const front = p("flamethrower", "front", action);
            const reach = p("flamethrower", "reach", action);
            const halfWidth = p("flamethrower", "halfWidth", action);
            const angle = p("flamethrower", "angle", action);
            const burnChance = Math.max(0.01, Math.min(0.5, p("flamethrower", "burnChance", action)));
            const density = Math.max(20, Math.round(p("flamethrower", "density", action)));
            const cap = Math.max(1, Math.round(p("flamethrower", "maxTargets", action)));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const maxSteps = Math.max(3, Math.ceil(reach / Math.max(0.25, front)) + 1);
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body !== null ? body.position() : current.origin();
                WorldFeedback.emit(scope, flamethrowerScene, 1, at, { moment: "fade", intensity: intensity, density: density }, 26);
                if (total > 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), flamethrowerHitText, [total], 24);
                sound(current, "minecraft:block.fire.extinguish");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const origin = body !== null ? body.position() : current.origin();
                let direction = aim(current);
                const target = current.target();
                if (target !== null && scope.valid(target)) {
                    const watched = scope.observe(target);
                    if (watched !== null) {
                        const delta = watched.position().minus(origin);
                        if (delta.length() > 0.01) direction = delta.unit();
                    }
                }
                const length = Math.min(reach, (step + 1) * front + 0.4);
                const region = wide
                    ? WorldGeometry.sector(origin, direction, length, angle, { below: 1, above: 2 })
                    : WorldGeometry.lane(origin, direction, length, halfWidth, { below: 1, above: 2 });
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref()) || hitRefs[ref] || total >= cap) return;
                    hitRefs[ref] = true;
                    const alreadyBurned = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "flamethrower", power,
                        { damage: damageSpec("flamethrower", "jet"), status: "burn", chance: burnChance })) return;
                    total++;
                    WorldFeedback.emit(scope, flamethrowerScene, 1, facts.position(),
                        { moment: "hit", target: ref, count: Math.max(8, Math.round(8 + power * 0.2)), intensity: intensity }, 22);
                    sound(current, "cobblemon:impact.fire");
                    if (!alreadyBurned && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), flamethrowerBurnText, [], 26);
                });
                const path = wide
                    ? flamethrowerFan(origin, direction, length, angle, 5)
                    : WorldGeometry.along(origin, origin.plus(direction.scale(length)), 0.6).map(flamethrowerVertex);
                WorldFeedback.keep(scope, "flamethrower:jet:" + String(actor.ref()), flamethrowerScene, 1, origin,
                    { moment: wide ? "jetwide" : "jet", path: path, length: length,
                        direction: [direction.x(), direction.y(), direction.z()], density: density, intensity: intensity }, 8);
                current.face(origin.plus(direction), 18, 18);
                step++;
                if (step >= maxSteps || length >= reach - 0.01) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.flamethrower.actor");
            const body = world.observe(actor);
            WorldFeedback.emit(world, flamethrowerScene, 1, body !== null ? body.position() : action.origin(),
                { moment: "charge", wide: wide, intensity: intensity }, 16);
            advance(action);
        }
    });
}
