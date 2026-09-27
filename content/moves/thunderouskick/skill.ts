/**
 * 雷鸣蹴击 / thunderouskick 的出手方式。
 *
 * 核心念头：**先用电光般的绕步把对手晃到分神，再从它没在看的那一侧踢出一脚**——绕步本身不伤人，
 * 只是让人读不出真正出脚的方向；踢中的那一下把护架踢开。它是本族唯一**靠走位和分神**换取破防的一记。
 *
 * 三幕：
 *   起（windup，提交前）：身上窜起一圈电光，脚底发亮。
 *   击（blink → kick）：提交后绕步最多 `feints` 次，每一次都闪到目标侧后方换一个方向（`blink`）；
 *       只有真正走动的步才留残影、才算数。最后从当前位置朝目标踢出：脚能到的距离是
 *       `standoff + kickSpeed`（站位＋脚掌伸展），**不随目标剩余距离拉长**，所以侧路被墙挡住时就只够原地短踢或踢空。
 *       踢中活物结算一次接触伤害，按踢开等级压防御、挂共享身份 `world_combat:status/guardbroken`，并把目标顶开。
 *       实际成功绕步达到三次以上、或踢之前目标正忙着打别人（`attacking` 不是自己）时会多踢开一级。
 *   收：踢空只留下一道电光（`miss`）；目标丢失时朝最后经过的方向短踢一下，不跨墙补命中。
 *
 * 与同族分开：同是「一击留痕、降防御」，撕裂爪是踏前交叉撕、铁尾是慢而重的下砸、暗影之骨是远程骨投、
 * 碎岩是贴脸连点；雷鸣蹴击是**先绕步再踢**，它的缺口来自对手的失位而不是被砸开——所以它先动、也是
 * 唯一奖励「目标正忙着打别人」的一招。
 *
 * 配置 `patient`（戏耍式）由 resolve 改时序、由公式改绕步与单发：开启＝多绕一步、踢开两级，但脚更轻。
 */
namespace PokemonSkills {
    const thunderouskickScene = "world_combat:move_thunderouskick";
    const thunderouskickGuard = "world_combat:thunderouskick_guard";
    const thunderouskickGuardText = "world_combat.move.thunderouskick.text.guard";
    const thunderouskickDistractText = "world_combat.move.thunderouskick.text.distracted";
    const thunderouskickMissText = "world_combat.move.thunderouskick.text.miss";

    /** 两个方向角之间的最短有符号夹角（弧度）。 */
    function thunderouskickTurn(from: number, to: number): number {
        let delta = to - from;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        return delta;
    }

    /** 目标碰撞箱在给定水平方向上的半宽，用来把侧身站位放到实际体表之外。 */
    function thunderouskickSurface(body: CombatObservation, direction: CombatPoint): number {
        const bounds = body.boundsMax().minus(body.boundsMin());
        return Math.abs(direction.x()) * bounds.x() * 0.5 + Math.abs(direction.z()) * bounds.z() * 0.5;
    }

    define({
        freeMovement: true,
        id: "thunderouskick",
        name: "Thunderous Kick",
        description: "以电光般的绕步在目标身侧来回闪几次，再从它没在看的一侧踢出一脚：踢中的目标防御下降并被顶开。只有真正走到的绕步才算数，脚够到的距离由站位与腿技伸展决定，不随目标跑得多远拉长；侧路被墙挡住就只够原地短踢或踢空。实用绕步越多、目标越是分神，护架被踢得越开。戏耍式多绕一步、踢开两级但脚更轻；疾踢式出脚更重更快。",
        uses: ["绕步到侧面踢开护架", "奖励正忙着打别人的目标", "单体破防后顶开对手"],
        kind: "enemy",
        range: 3.4,
        maxRange: 5.5,
        prepare: 7,
        active: 26,
        recover: 8,
        cooldown: 32,
        style: "kick",
        defaults: { patient: false, ai: { maxChase: 7, flank: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("thunderouskick", "collisionRadius", pokemon), geometry: "line", style: "electric",
                color: 0xE8D24A, label: config && config.patient === true ? "戏耍蹴击" : "疾踢蹴击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["thunderouskick"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var patient = !!(config && config.patient);
            return {
                prepare: p("thunderouskick", "prepare", context) + (patient ? 4 : 0),
                recover: p("thunderouskick", "recover", context),
                cooldown: p("thunderouskick", "cooldown", context) + (patient ? 8 : 0),
                active: skills["thunderouskick"].active,
                range: skills["thunderouskick"].range
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_thunderouskick:windup", thunderouskickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", patient: config && config.patient === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const feints = Math.max(1, Math.min(4, Math.round(p("thunderouskick", "feints", action))));
            const blink = p("thunderouskick", "blinkRange", action);
            const standoff = p("thunderouskick", "standoff", action);
            const power = p("thunderouskick", "kick", action);
            const kickSpeed = p("thunderouskick", "kickSpeed", action);
            const stages = Math.max(1, Math.round(p("thunderouskick", "guardStages", action)));
            const bonus = Math.max(0, Math.round(p("thunderouskick", "feintBonus", action)));
            const guardTicks = Math.max(40, Math.round(p("thunderouskick", "guardTicks", action)));
            const push = p("thunderouskick", "push", action);
            const kickRadius = p("thunderouskick", "collisionRadius", action);
            // 脚能伸到的距离 = 侧身站位 + 出脚伸展；由自身体型（判定半径）与速度参数决定，不由目标剩余距离决定。
            const kickReach = Math.max(0.8, Math.min(6, standoff + kickSpeed));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            let settled = false, attempts = 0, successSteps = 0, lastDirection: CombatPoint | null = null;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function victim(scope: CombatWorld): CombatActor | null { const value = targetRef === "" ? null : scope.actor(targetRef); return value !== null && scope.valid(value) ? value : null; }

            sound(action, "cobblemon:move.thundershock.actor");

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, thunderouskickScene, 1, me.position(), { moment: "miss", steps: successSteps, intensity: intensity }, 22);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.1, 0)), thunderouskickMissText, [], 22);
                }
                finish(current);
            }

            /** 最后那一脚：朝目标方向（目标已离场则朝最后经过的方向）踢出固定伸展，踢实就结算、够不到就收。 */
            function kick(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor()), aimAt = victim(scope);
                const body = aimAt !== null ? scope.observe(aimAt) : null;
                if (me === null) { whiff(current); return; }
                let forward: CombatPoint;
                if (body !== null) {
                    const dx = body.position().x() - me.position().x(), dz = body.position().z() - me.position().z();
                    const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
                    forward = WorldCombat.point(dx / distance, 0, dz / distance);
                } else if (lastDirection !== null) forward = lastDirection;
                else {
                    const fallback = action.direction();
                    const flat = WorldCombat.point(fallback.x(), 0, fallback.z());
                    forward = flat.length() < 0.05 ? WorldCombat.point(0, 0, 1) : flat.unit();
                }
                const end = me.position().plus(forward.scale(kickReach));
                const hit = current.trace(me.position(), end, kickRadius);
                if (!hit.hitEntity()) { whiff(current); return; }
                const struck = hit.target(), point = hit.position();
                const landed = impact(current, hit, "thunderouskick", power, { damage: damageSpec("thunderouskick", "kick"), contact: true });
                const impactCount = Math.round(16 + intensity * 8);
                WorldFeedback.emit(scope, thunderouskickScene, 1, point,
                    { moment: "kick", target: struck !== null ? String(struck.ref()) : "", steps: successSteps, reach: kickReach,
                        direction: [forward.x(), 0, forward.z()], contact: [point.x(), point.y(), point.z()],
                        from: [me.position().x(), me.position().y(), me.position().z()],
                        path: [[me.position().x(), me.position().y(), me.position().z()], [point.x(), point.y(), point.z()]],
                        landed: landed ? 1 : 0, impact: landed ? impactCount : 0, intensity: intensity }, 26);
                sound(current, landed ? "cobblemon:impact.fighting" : "minecraft:entity.player.attack.nodamage");
                if (landed && struck !== null && scope.valid(struck)) {
                    const facts = scope.observe(struck);
                    const facing = facts !== null ? facts.attacking() : null;
                    // 忙打别人只说明它分神，不推断真实视线，所以只叫「分神」。
                    const distracted = facing !== null && String(facing.ref()) !== String(current.actor().ref());
                    const amount = stages + (successSteps >= 3 ? bonus : 0) + (distracted ? 1 : 0);
                    // 临时破防：护架缺口是一段 own window，锚到真实 guard 载体上，到期/被清除时一并收回，
                    // 不留下永久降防却只挂短标记的错位。
                    const before = NativeEffects.effectiveStage(scope, struck, "def");
                    const carrier = MobEffects.apply(scope, struck, thunderouskickGuard, guardTicks, 0);
                    let dropped = 0;
                    if (carrier !== null) {
                        const window = NativeEffects.boostWindow(scope, struck, { def: -amount }, guardTicks,
                            "world_combat:move/thunderouskick", carrier);
                        if (window > 0) dropped = Math.max(0, before - NativeEffects.effectiveStage(scope, struck, "def"));
                        if (!(dropped > 0)) MobEffects.consume(scope, struck, thunderouskickGuard);
                    }
                    // 实际降级了多少级才裂甲：被能力拦截或已到下限就不冒成功反馈。
                    if (dropped > 0) {
                        WorldFeedback.emit(scope, thunderouskickScene, 1, point,
                            { moment: "guard", target: String(struck.ref()), stages: dropped, distracted: distracted ? 1 : 0 }, 24);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)),
                            distracted ? thunderouskickDistractText : thunderouskickGuardText, [dropped], 28);
                        sound(current, "minecraft:item.trident.thunder");
                    }
                    const away = WorldCombat.point(point.x() - me.position().x(), 0, point.z() - me.position().z());
                    if (away.length() > 0.2) scope.hitDisplace(struck, away.unit().scale(push));
                }
                finish(current);
            }

            /**
             * 一次电光绕步：闪到目标侧后方 standoff 格处，换一个方向。整段位移交给共享 `LivingActions.step`
             * （单次位移不超过 `blinkRange`，墙体照常挡住）。只有真正走动的一步才留残影、才计进 successful steps。
             */
            function blinkNext(current: CombatAction): void {
                if (attempts >= feints) { kick(current); return; }
                const scope = current.world(), me = scope.observe(current.actor()), aimAt = victim(scope);
                const body = aimAt !== null ? scope.observe(aimAt) : null;
                if (me === null) { whiff(current); return; }
                if (body === null) { kick(current); return; }
                const before = me.position();
                // 绕步的「绕」按相对目标中心的真实角位移计：直追（角度几乎不变）或撞墙（只走一点）
                // 都达不到阈值，不再因为位移超过 0.5 格就白送一次成功绕步。
                const toward = Math.atan2(before.z() - body.position().z(), before.x() - body.position().x());
                const angle = toward + (attempts % 2 === 0 ? 1 : -1) * Math.PI / 3;
                const radial = WorldCombat.point(Math.cos(angle), 0, Math.sin(angle));
                // 站位以目标实际体表为准，至少让开半个体宽再留一点间隙。
                const radius = Math.max(standoff, thunderouskickSurface(body, radial) + thunderouskickSurface(me, radial) + 0.3);
                const destination = WorldCombat.point(body.position().x() + radial.x() * radius, before.y(), body.position().z() + radial.z() * radius);
                const desired = destination.minus(before), feet = WorldCombat.point(before.x(), me.boundsMin().y(), before.z());
                const route = SurfacePaths.advance(scope, feet, desired, Math.min(blink, desired.length()),
                    { up: .1, down: .35, spacing: .2, samples: Math.ceil(blink / .2) });
                const applied = route.travelled > .02 ? LivingActions.step(scope, current.actor(), route.point.minus(feet), blink) : 0;
                attempts++;
                const moved = scope.observe(current.actor());
                const at = moved !== null ? moved.position() : before;
                const travelled = at.minus(before);
                const flat = WorldCombat.point(travelled.x(), 0, travelled.z());
                const after = Math.atan2(at.z() - body.position().z(), at.x() - body.position().x());
                const turned = Math.abs(thunderouskickTurn(toward, after));
                if (applied > 0.5 && flat.length() > 0.2 && turned >= Math.PI / 9) {
                    successSteps++;
                    lastDirection = flat.unit();
                    // 残影留在真正走过的旧点，并沿这一段真实端点连出短电光，位置不再跟当前 source。
                    WorldFeedback.emit(scope, thunderouskickScene, 1, at,
                        { moment: "blink", index: attempts, steps: successSteps, planned: feints,
                            point: [before.x(), before.y(), before.z()],
                            path: [[before.x(), before.y(), before.z()], [at.x(), at.y(), at.z()]],
                            direction: [lastDirection.x(), 0, lastDirection.z()], intensity: intensity }, 16);
                    sound(current, attempts % 2 === 0 ? "minecraft:entity.enderman.teleport" : "minecraft:entity.player.teleport");
                }
                current.after(1, blinkNext);
            }

            blinkNext(action);
        }
    });
}
