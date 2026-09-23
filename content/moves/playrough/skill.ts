/**
 * 嬉闹 / playrough —— 注册与动作。
 *
 * 核心念头：一记**滚翻扑撞的撒欢**。压低身子冲上去、用整个身体把对手撞得人仰马翻，把它顶开一段；
 * 撞翻一个若旁边还站着别人，就顺势再滚过去翻第二个。被撞翻的人攻击下降。
 *
 * 两幕：
 *   起（windup，提交前）：压低身子、脚下扬尘，只播预告。
 *   滚（run → impact / ricochet → disarm，提交后）：沿瞄准方向逐刻推进，trace 撞上活体即结算 romp
 *       接触伤害、把目标顶开 push 格、按概率把攻击压 1 级；撒欢式若在 bounceRange 内还有另一个敌人，
 *       掉头再滚一段（长度 ×0.85）落一记更轻的 tumble；撞空则一路滚到尽头。
 *
 * 与同族分开：撕裂爪是站定的一记交叉撕抓，迷昏拳是按节拍连打，嬉闹是会移动、会把目标顶开、
 * 还可能翻到第二个目标身上的那一记。配置 `romp`（撒欢）由 resolve 改时序、由公式改距离／顶开／概率。
 */
namespace PokemonSkills {
    /** 位移小于这个值就认为被挡住，收势。 */
    const playroughMinimumMove = 0.02;

    /** 在 centre 附近找最近的一个「还没被这一记撞过」的非友方，作为翻滚的第二个目标。 */
    function playroughNearestEnemy(world: CombatWorld, actor: CombatActor, used: { [ref: string]: boolean }, centre: CombatPoint, range: number): CombatActor | null {
        const actors = world.query(centre, range, false);
        let best: CombatActor | null = null, bestDistance = range;
        for (let index = 0; index < actors.length; index++) {
            const other = actors[index];
            if (String(other.ref()) === String(actor.ref()) || world.friendly(other) || used[String(other.ref())]) continue;
            const body = world.observe(other);
            if (body === null) continue;
            const distance = body.position().minus(centre).length();
            if (distance <= bestDistance) { bestDistance = distance; best = other; }
        }
        return best;
    }

    define({
        id: playroughId,
        cooldownParameter: "recharge",
        name: "Play Rough",
        description: "滚翻着扑向目标，用整个身体把它撞得人仰马翻并顶开一段，可能让它的攻击下降 1 级；撒欢式若旁边还有别的敌人，会顺势再翻过去撞第二个。",
        uses: ["冲上去把对手撞翻、顶离原位", "在扎堆的敌人之间来回翻滚", "压制物理攻击手"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.8,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "fairy",
        defaults: { romp: false, ai: { maxChase: 8, cluster: true, finish: true } },
        fields: [flag("romp", "撒欢")],
        indicator: function (config, pokemon) {
            return { radius: p(playroughId, "lunge", pokemon) + 0.4, geometry: "line", style: "fairy", color: 0xF0A8C8,
                label: config && config.romp === true ? "嬉闹·撒欢" : "嬉闹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[playroughId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(playroughId, "tempo", context)),
                recover: Math.round(p(playroughId, "aftercast", context)),
                cooldown: Math.round(p(playroughId, "recharge", context)),
                active: 0,
                range: p(playroughId, "lunge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:playrough:windup", playroughScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", romp: config && config.romp === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const romp = !!(config && config.romp);
            const rompPower = p(playroughId, "romp", action);
            const tumblePower = p(playroughId, "tumble", action);
            const cruise = p(playroughId, "cruise", action);
            const radius = p(playroughId, "radius", action);
            const traceAhead = p(playroughId, "traceAhead", action);
            const push = p(playroughId, "push", action);
            const chance = Math.max(0.02, Math.min(0.9, p(playroughId, "atkChance", action)));
            const stages = Math.max(1, Math.round(p(playroughId, "atkStages", action)));
            const bounceRange = p(playroughId, "bounceRange", action);
            const sparkles = Math.max(8, Math.round(p(playroughId, "sparkles", action)));
            const lungeTotal = p(playroughId, "lunge", action);
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.48));
            const intensity = Math.max(0.6, Math.min(2.2, rompPower / 76));
            const used: { [ref: string]: boolean } = {};
            const heading = aim(action);
            let direction = WorldCombat.point(heading.x(), 0, heading.z());
            direction = direction.length() < 0.01 ? WorldCombat.point(0, 0, 1) : direction.unit();
            let travelled = 0, length = lungeTotal, ricochets = 0, struck = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (!struck) {
                    const body = current.world().observe(actor);
                    const at = body === null ? current.origin() : body.position();
                    WorldFeedback.emit(current.world(), playroughScene, 1, at, { moment: "miss", scale: scale, intensity: intensity }, 20);
                    WorldFeedback.text(current.world(), at.plus(WorldCombat.point(0, 1.2, 0)), playroughMissText, [], 20);
                }
                done(current);
            }

            function strike(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                const at = hit.position();
                const first = !struck;
                const power = first ? rompPower : tumblePower;
                const landed = victim !== null && impact(current, hit, playroughId, power,
                    { damage: damageSpec(playroughId, first ? "romp" : "tumble"), contact: true });
                struck = true;
                WorldFeedback.emit(scope, playroughScene, 1, at,
                    { moment: first ? "impact" : "ricochet", target: victim !== null ? String(victim.ref()) : "",
                        sparkles: sparkles, scale: scale, intensity: intensity }, 26);
                if (landed && victim !== null && scope.valid(victim)) {
                    used[String(victim.ref())] = true;
                    scope.displace(victim, direction.scale(push));
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), playroughDownText, [], 22);
                    if (scope.random() < chance) {
                        NativeEffects.boost(scope, victim, "atk", -stages);
                        WorldFeedback.emit(scope, playroughScene, 1, at, { moment: "disarm", target: String(victim.ref()), sparkles: sparkles }, 22);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), playroughAtkText, [stages], 24);
                    }
                    sound(current, "cobblemon:impact.fairy");
                    if (romp && ricochets < 1) {
                        const next = playroughNearestEnemy(scope, actor, used, at, bounceRange);
                        const selfBody = scope.observe(actor), nextBody = next === null ? null : scope.observe(next);
                        if (next !== null && selfBody !== null && nextBody !== null) {
                            const delta = nextBody.position().minus(selfBody.position());
                            const flat = WorldCombat.point(delta.x(), 0, delta.z());
                            if (flat.length() > 0.05) {
                                direction = flat.unit();
                                ricochets++;
                                travelled = 0;
                                length = lungeTotal * 0.85;
                                WorldFeedback.emit(scope, playroughScene, 1, selfBody.position(),
                                    { moment: "roll", target: String(next.ref()), sparkles: sparkles, scale: scale, intensity: intensity }, 20);
                                current.after(2, advance);
                                return;
                            }
                        }
                    }
                }
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(cruise, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) { strike(current, hit); return; }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < playroughMinimumMove || travelled >= length) { finish(current); return; }
                current.after(1, advance);
            }

            WorldFeedback.emit(world, playroughScene, 1, action.origin(),
                { moment: "run", scale: scale, intensity: intensity, sparkles: sparkles }, 44);
            sound(action, "minecraft:entity.player.attack.strong");
            advance(action);
        }
    });
}
