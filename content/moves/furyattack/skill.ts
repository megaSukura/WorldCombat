/**
 * 乱击 / furyattack —— 出手方式。
 *
 * 核心念头：**原地定点突刺**——施法者扎住脚步，用角或喙朝同一个点一下一下地戳；每一刺都把对手顶退一点，
 *   退到够不着的地方这串就断。它是本族唯一站定不动、把对手推着打的连击：贴着墙的目标躲不开会被整串吃满；
 *   站在空地上的会被一路顶出射程，这串自然提前收场。
 *
 * 幕：
 *   起（lower，提交前）：低头压角、脚下扎稳，角尖聚起一线光；`action.present`，可打断、不花 PP。
 *   刺（thrust，提交后）：`jabs` 刺。每一刺沿身前 `reach` 长、`tipWidth` 半宽的窄走廊判定，至多 `maxTargets`
 *       个非友方各吃一记 `jab` 接触伤害，随后被沿刺击方向顶退 `push` 格。每刺独立掷 `accuracy`；
 *       目标已被顶出 `reach` 之外，或这一刺落空，这串就停（浮字提示）。
 *
 * 选取 `kind: "aim"`：可以点任意阵营实体，也可以只给一个方向起手；准线在提交那一刻锁死，每刺同轴。
 *   空放沿固定准线刺完整串，撞不到人也不提前收势；跟步走原生可达位移，撞墙则照实停住。
 *   收（settle）：这一串刺完收势，余尘落定。
 *
 * 与同族分开：乱抓会绕圈换位、扫尾拍打是原地整圈旋尾、骨棒乱打是掷骨夯地；只有乱击站定不挪、把目标一路顶退，
 *   反制方式是站到空地上让它把自己推出射程，或背身贴墙让它吃满整串。
 *
 * 配置 `close`（追击式）由 resolve 改时序、由公式改威力／顶退／追步与命中面；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 一刺走廊四角：origin 起、朝 direction 长 reach、半宽 half；判定与表现共用同一组顶点。 */
    function furyattackLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        freeMovement: true,
        id: furyattackId,
        cooldownParameter: "recharge",
        name: "Fury Attack",
        description: "站定用角或喙朝一点连续突刺：每一刺把对手顶退，退到够不着的地方这串就断。可以点敌人，也可以只给一个方向起手，准线在起手时锁死、每刺同轴；空放会沿准线刺完整串。顶退式站定不动、一路把人推出射程；追击式向前跟住，把整串吃满。",
        uses: ["站定用角喙朝一点连续突刺", "每一刺把对手顶退，一路把它推出射程", "追击式跟住走位，把整串吃满", "只朝一个方向起手，沿固定准线空刺完整串"],
        kind: "aim",
        range: 2.9,
        maxRange: 4.3,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 24,
        maximumTicks: 200,
        style: "thrust",
        defaults: { close: false, ai: { maxChase: 7, corner: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[furyattackId], detail: { values: config } };
            return { radius: p(furyattackId, "reach", context), geometry: "line", style: "thrust", color: 0xFFE9A8,
                label: config && config.close === true ? "乱击·追击式" : "乱击·顶退式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[furyattackId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(furyattackId, "tempo", context)),
                recover: Math.round(p(furyattackId, "settle", context)),
                cooldown: Math.round(p(furyattackId, "recharge", context)),
                active: 0,
                range: p(furyattackId, "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            const jabs = Math.max(2, Math.min(5, Math.round(p(furyattackId, "jabs", action))));
            const sparks = Math.max(6, Math.round(p(furyattackId, "sparks", action)));
            action.present("furyattack:lower:" + action.id(), furyattackScene, 1, action.origin(),
                JSON.stringify({ moment: "lower", jabs: jabs, sparks: sparks, windup: prepare,
                    close: config && config.close === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const targetRef = target !== null && world.valid(target) ? String(target.ref()) : "";
            const power = p(furyattackId, "jab", action);
            const jabs = Math.max(2, Math.min(5, Math.round(p(furyattackId, "jabs", action))));
            const gap = Math.max(2, Math.round(p(furyattackId, "gap", action)));
            const reach = p(furyattackId, "reach", action);
            const half = p(furyattackId, "tipWidth", action);
            const push = p(furyattackId, "push", action);
            const step = p(furyattackId, "step", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p(furyattackId, "accuracy", action)));
            const sparks = Math.max(8, Math.round(p(furyattackId, "sparks", action)));
            const cap = Math.max(1, Math.round(p(furyattackId, "maxTargets", action)));
            const close = !!(config && config.close === true);
            const band = { below: 1.0, above: 1.9 };
            const scale = Math.max(0.5, Math.min(1.8, half / 0.38));
            const intensity = Math.max(0.5, Math.min(2.4, power / 18));
            // 提交那刻锁死一条准线；每刺同轴，不再随目标转身。命中 85 的偏角只在这一刻挂上。
            const heading = NativeSemantics.aim(action, move,
                WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction()), 1.3);
            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, furyattackScene, 1, at,
                    { moment: "settle", jabs: jabs, landed: landed, sparks: sparks, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), furyattackTallyText, [landed], 22);
                finish(current);
            }

            function thrust(current: CombatAction): void {
                if (settled) return;
                if (index >= jabs) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position();
                const shot = index + 1;
                // 有实体目标时：被前面的刺顶出射程就到此为止。空放/方向刺没有这个条件，沿固定准线继续。
                if (targetRef !== "") {
                    const victim = scope.actor(targetRef);
                    const vbody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                    if (vbody === null || vbody.position().minus(origin).length() > reach + 0.3) {
                        WorldFeedback.emit(scope, furyattackScene, 1, origin.plus(heading.scale(reach)),
                            { moment: "out", index: shot, jabs: jabs, reach: reach, sparks: sparks, scale: scale }, 18);
                        WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), furyattackOutText, [landed], 22);
                        settle(current);
                        return;
                    }
                }
                // 每刺同轴：判定与表现共用提交时锁死的那条准线。
                const lane = furyattackLane(origin, heading, reach, half);
                WorldFeedback.emit(scope, furyattackScene, 1, origin,
                    { moment: "thrust", path: lane, index: shot, jabs: jabs, reach: reach,
                        direction: [heading.x(), heading.y(), heading.z()], sparks: sparks, scale: scale, intensity: intensity }, 18);
                sound(current, "minecraft:entity.player.attack.weak");
                // 只对实体目标掷这一刺的命中率；朝空方向直接看真实接触。
                if (targetRef !== "" && scope.random() > accuracy) {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), furyattackMissText, [shot], 20);
                    settle(current);
                    return;
                }
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, heading, reach, half, band), function (other, facts) {
                    if (hits >= cap) return;
                    if (!scope.clear(origin, facts.position())) return;
                    if (!hurt(current, other, furyattackId, power, { damage: damageSpec(furyattackId, "jab"), contact: true })) return;
                    hits++;
                    landed++;
                    const at = facts.position();
                    if (scope.valid(other)) scope.hitDisplace(other, WorldCombat.point(heading.x(), 0, heading.z()).scale(push));
                    WorldFeedback.emit(scope, furyattackScene, 1, at,
                        { moment: "hit", target: String(other.ref()), index: shot, jabs: jabs, sparks: sparks,
                            push: Math.round(push * 100) / 100, scale: scale, intensity: intensity }, 20);
                    scope.sound("cobblemon:impact.fighting", at, 14, "{}");
                });
                if (hits === 0 && targetRef !== "") {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), furyattackMissText, [shot], 20);
                    settle(current);
                    return;
                }
                index = shot;
                // 追击式：把距离重新压回射程内；走原生可达位移，撞墙则照实停住。
                if (close && step > 0.05) scope.displace(actor, WorldCombat.point(heading.x(), 0, heading.z()).scale(step));
                if (index >= jabs) { settle(current); return; }
                current.after(gap, thrust);
            }

            sound(action, "cobblemon:move.horndrill.target_1");
            WorldFeedback.emit(world, furyattackScene, 1, action.origin(),
                { moment: "lower", jabs: jabs, sparks: sparks, scale: scale, intensity: intensity }, 16);
            thrust(action);
        }
    });
}
