/**
 * 雷鸣蹴击 / thunderouskick 的出手方式。
 *
 * 核心念头：**先用电光般的绕步把对手晃到分神，再从它没在看的那一侧踢出一脚**——绕步本身不伤人，
 * 只是让人读不出真正出脚的方向；踢中的那一下把护架踢开。它是本族唯一**靠走位和分神**换取破防的一记。
 *
 * 三幕：
 *   起（windup，提交前）：身上窜起一圈电光，脚底发亮。
 *   击（blink → kick）：提交后绕步 `feints` 次，每一次都闪到目标侧后方换一个方向（`blink`）；
 *       最后从当前一侧冲向目标踢出，命中活物结算一次接触伤害，按踢开等级压防御、挂共享身份
 *       `world_combat:status/guardbroken`，并把目标顶开。绕步达到三次以上、或踢之前目标正忙着打别人
 *       （`attacking` 不是自己）时会多踢开一级——这是「戏耍」真正兑现的地方。
 *   收：踢空只留下一道电光（`miss`）。
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
    const thunderouskickBlindText = "world_combat.move.thunderouskick.text.blind";
    const thunderouskickMissText = "world_combat.move.thunderouskick.text.miss";

    define({
        id: "thunderouskick",
        name: "Thunderous Kick",
        description: "以电光般的绕步在目标身侧来回闪几次，再从它没在看的一侧踢出一脚：踢中的目标防御下降并被顶开。绕步越多、目标越是分神，护架被踢得越开。戏耍式多绕一步、踢开两级但脚更轻；疾踢式出脚更重更快。",
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
            const actor = action.actor();
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
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            let settled = false, step = 0;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function victim(scope: CombatWorld): CombatActor | null { const value = targetRef === "" ? null : scope.actor(targetRef); return value !== null && scope.valid(value) ? value : null; }

            sound(action, "cobblemon:move.thundershock.actor");

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, thunderouskickScene, 1, me.position(), { moment: "miss", feints: feints, intensity: intensity }, 22);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.1, 0)), thunderouskickMissText, [], 22);
                }
                finish(current);
            }

            /** 最后那一脚：从当前一侧朝目标冲过去，踢实就结算、踢空就收。 */
            function kick(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor()), aimAt = victim(scope);
                const body = aimAt !== null ? scope.observe(aimAt) : null;
                if (me === null || body === null) { whiff(current); return; }
                const dx = body.position().x() - me.position().x(), dz = body.position().z() - me.position().z();
                const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
                const forward = WorldCombat.point(dx / distance, 0, dz / distance);
                const hit = current.trace(me.position(), me.position().plus(forward.scale(Math.min(7, distance + kickSpeed))), kickRadius);
                if (!hit.hitEntity()) { whiff(current); return; }
                const struck = hit.target(), point = hit.position();
                const landed = impact(current, hit, "thunderouskick", power, { damage: damageSpec("thunderouskick", "kick"), contact: true });
                WorldFeedback.emit(scope, thunderouskickScene, 1, point,
                    { moment: "kick", target: struck !== null ? String(struck.ref()) : "", feints: feints, intensity: intensity }, 26);
                sound(current, "cobblemon:impact.fighting");
                if (landed && struck !== null && scope.valid(struck)) {
                    const facts = scope.observe(struck);
                    const facing = facts !== null ? facts.attacking() : null;
                    const blind = facing !== null && String(facing.ref()) !== String(current.actor().ref());
                    const amount = stages + (feints >= 3 ? bonus : 0) + (blind ? 1 : 0);
                    NativeEffects.boost(scope, struck, "def", -amount);
                    MobEffects.apply(scope, struck, thunderouskickGuard, guardTicks, 0);
                    WorldFeedback.emit(scope, thunderouskickScene, 1, point,
                        { moment: "guard", target: String(struck.ref()), stages: amount, blind: blind ? 1 : 0 }, 24);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)),
                        blind ? thunderouskickBlindText : thunderouskickGuardText, [amount], 28);
                    const away = WorldCombat.point(point.x() - me.position().x(), 0, point.z() - me.position().z());
                    if (away.length() > 0.2) scope.displace(struck, away.unit().scale(push));
                    sound(current, "minecraft:item.trident.thunder");
                }
                finish(current);
            }

            /** 一步步走近一个落点；单次位移不超过 blinkRange（1.4–3.0 格），避免超出宿主的位移步长上限。 */
            function stepToward(current: CombatAction, destination: CombatPoint, remaining: number): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me === null) { whiff(current); return; }
                const dx = destination.x() - me.position().x(), dz = destination.z() - me.position().z();
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance < 0.5 || remaining <= 0) { afterStep(current); return; }
                const move = Math.min(blink, distance), mx = dx / distance * move, mz = dz / distance * move;
                scope.displace(current.actor(), WorldCombat.point(mx, 0, mz));
                const moved = scope.observe(current.actor());
                WorldFeedback.emit(scope, thunderouskickScene, 1, moved !== null ? moved.position() : me.position(),
                    { moment: "blink", index: step + 1, feints: feints, direction: [mx, 0, mz], intensity: intensity }, 16);
                current.after(1, function (next: CombatAction) { stepToward(next, destination, remaining - 1); });
            }

            function afterStep(current: CombatAction): void {
                step++;
                if (step >= feints) { kick(current); return; }
                current.after(1, blinkNext);
            }

            /** 一次次电光绕步：闪到目标侧后方 standoff 格处，换一个方向。 */
            function blinkNext(current: CombatAction): void {
                if (step >= feints) { kick(current); return; }
                const scope = current.world(), me = scope.observe(current.actor()), aimAt = victim(scope);
                const body = aimAt !== null ? scope.observe(aimAt) : null;
                if (me === null || body === null) { whiff(current); return; }
                const angle = Math.atan2(body.position().z() - me.position().z(), body.position().x() - me.position().x())
                    + (step % 2 === 0 ? 1 : -1) * Math.PI * 0.62;
                const destination = WorldCombat.point(body.position().x() + Math.cos(angle) * standoff, me.position().y(), body.position().z() + Math.sin(angle) * standoff);
                sound(current, step % 2 === 0 ? "minecraft:entity.enderman.teleport" : "minecraft:entity.player.teleport");
                stepToward(current, destination, 5);
            }

            blinkNext(action);
        }
    });
}
