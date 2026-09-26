/**
 * 嬉闹 / playrough —— 注册与动作。
 *
 * 核心念头：一记**滚翻扑撞的撒欢**。压低身子冲上去、用整个身体把对手撞得人仰马翻，把它顶开一段；
 * 撞翻一个若旁边还站着别人，就顺势再滚过去翻第二个。被撞翻的人攻击下降。
 *
 * 选取：`kind: "aim"`——首段朝瞄准方向自由滚出，点方向、点世界点或让 AI 推荐敌人都行，允许空扑；
 *   提交与执行都不要求存在敌人（不引用 action.target()）。
 *
 * 两幕：
 *   起（windup，提交前）：压低身子、脚下扬尘，只播预告。
 *   滚（run → impact / ricochet → disarm，提交后）：沿瞄准方向逐刻推进，sweepStep 撞上活体即结算 romp
 *       接触伤害、把目标顶开 push 格、按概率把攻击压 1 级；被接触的实体当场记 used，免疫伤害也不会被再选。
 *       撒欢式首段撞实后，在可见、通视且真实可达的 bounceRange 内选另一个敌人，定下真实转向再滚一段
 *       （长度按距目标实际需要，最多第一段那么远）落一记更轻的 tumble；转向后遇墙即停，不绕墙补中。
 *
 * 与同族分开：撕裂爪是站定的一记交叉撕抓，迷昏拳是按节拍连打，嬉闹是会移动、会把目标顶开、
 * 还可能翻到第二个目标身上的那一记。配置 `romp`（撒欢）由 resolve 改时序、由公式改距离／顶开／概率。
 */
namespace PokemonSkills {
    /** 位移小于这个值就认为被挡住，收势。 */
    const playroughMinimumMove = 0.02;

    /**
     * 翻滚的第二目标：在 centre 的 range 内、从施法者看真实可达（reach 之内）且可见、通视的最近非友方，
     * 排除自己与已经接触过的实体。没有合适目标返回 null。
     */
    function playroughBounceTarget(world: CombatWorld, actor: CombatActor, used: { [ref: string]: boolean },
        centre: CombatPoint, range: number, reach: number): CombatActor | null {
        const self = world.observe(actor);
        if (self === null) return null;
        const from = self.position();
        const actors = world.query(centre, range, false);
        let best: CombatActor | null = null, bestDistance = reach;
        for (let index = 0; index < actors.length; index++) {
            const other = actors[index];
            const ref = String(other.ref());
            if (ref === String(actor.ref()) || world.friendly(other) || used[ref]) continue;
            const body = world.observe(other);
            if (body === null || body.health() <= 0 || !world.visible(other)) continue;
            const at = body.position();
            const distance = at.minus(from).length();
            if (distance < 0.05 || distance > bestDistance || !world.clear(from, at)) continue;
            bestDistance = distance; best = other;
        }
        return best;
    }

    define({
        freeMovement: true,
        id: playroughId,
        cooldownParameter: "recharge",
        name: "Play Rough",
        description: "滚翻着扑向目标，用整个身体把它撞得人仰马翻并顶开一段，可能让它的攻击下降 1 级；撒欢式若旁边还有别的敌人，会顺势再翻过去撞第二个。",
        uses: ["冲上去把对手撞翻、顶离原位", "在扎堆的敌人之间来回翻滚", "压制物理攻击手"],
        kind: "aim",
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
            const movementScenes = WorldFeedback.actionScenes(playroughScene);
            const world = action.world();
            const actor = action.actor();
            const romp = !!(config && config.romp);
            const rompPower = p(playroughId, "romp", action);
            const tumblePower = p(playroughId, "tumble", action);
            const cruise = p(playroughId, "cruise", action);
            const radius = p(playroughId, "radius", action);
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
                movementScenes.finish(current, done);
            }

            function strike(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const victim = hit.target();
                const at = hit.position();
                const first = !struck;
                // 接触即登记：无论这一记是否真的造成伤害，都不会再被选作目标。
                if (victim !== null) used[String(victim.ref())] = true;
                const power = first ? rompPower : tumblePower;
                const landed = victim !== null && impact(current, hit, playroughId, power,
                    { damage: damageSpec(playroughId, first ? "romp" : "tumble"), contact: true });
                struck = true;
                WorldFeedback.emit(scope, playroughScene, 1, at,
                    { moment: first ? "impact" : "ricochet", target: victim !== null ? String(victim.ref()) : "",
                        sparkles: sparkles, scale: scale, intensity: intensity }, 26);
                if (landed && victim !== null && scope.valid(victim)) {
                    scope.hitDisplace(victim, direction.scale(push));
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), playroughDownText, [], 22);
                    if (scope.random() < chance) {
                        NativeEffects.boost(scope, victim, "atk", -stages);
                        WorldFeedback.emit(scope, playroughScene, 1, at, { moment: "disarm", target: String(victim.ref()), sparkles: sparkles }, 22);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), playroughAtkText, [stages], 24);
                    }
                    sound(current, "cobblemon:impact.fairy");
                    // 只有首段成功地撞到有效敌人，且还有可见、通视的第二个目标，才真的转身再滚。
                    if (first && romp && ricochets < 1) {
                        const secondLength = lungeTotal * 0.85;
                        const next = playroughBounceTarget(scope, actor, used, at, bounceRange, Math.min(bounceRange, lungeTotal));
                        const selfBody = scope.observe(actor), nextBody = next === null ? null : scope.observe(next);
                        if (next !== null && selfBody !== null && nextBody !== null) {
                            const delta = nextBody.position().minus(selfBody.position());
                            const flat = WorldCombat.point(delta.x(), 0, delta.z());
                            if (flat.length() > 0.05) {
                                direction = flat.unit();
                                ricochets++;
                                travelled = 0;
                                length = Math.min(lungeTotal, Math.max(secondLength, flat.length() + radius + 0.2));
                                WorldFeedback.emit(scope, playroughScene, 1, selfBody.position(),
                                    { moment: "roll", target: String(next.ref()),
                                        direction: [direction.x(), direction.y(), direction.z()],
                                        sparkles: sparkles, scale: scale, intensity: intensity }, 22);
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
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                let progressed = swept.moved;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const ref = victim === null ? "" : String(victim.ref());
                    if (victim !== null && ref !== "" && !used[ref] && !scope.friendly(victim)) {
                        strike(current, hit);
                        return;
                    }
                    // 已经接触过的目标不再重复结算，碾过去继续扑向下一个。
                    if (swept.remaining.length() > 0.001) progressed += scope.displace(current.actor(), swept.remaining);
                }
                travelled += progressed;
                if (hit.blocked() || progressed < playroughMinimumMove || travelled >= length) { finish(current); return; }
                current.after(1, advance);
            }

            movementScenes.show(action, "run", action.origin(), { moment: "run", scale: scale, intensity: intensity, sparkles: sparkles });
            sound(action, "minecraft:entity.player.attack.strong");
            advance(action);
        }
    });
}
