/**
 * 捏碎 / crushgrip 的出手方式。
 *
 * 念头的形状：两片巨掌的轮廓在目标两侧浮出、张开（loom，提交前只播预告）→ 沿瞄准方向抓向**第一个碰到的敌人**、
 *   合拢捏住（grip）：命中一记随「目标完整度」结算的 `grip`；高举式再把它整个人提离地面（hoist）；只有真正被举起，
 *   才在 `hold` 刻后砸回地面（slam）补一记固定伤害并短暂定身（`holdTicks`）→ 手掌散去。免疫位移、或被顶住没举起来的目标
 *   只结算初握，不补定身、也不播悬空掌，位置不变。
 *
 * 举没举起来读的是**原生实际高度差**：先施加原生受击冲量、按住时再拉回实际高度，全程记录真实离地多少；
 * 升不过门槛（免疫位移／被顶住）就当没举起，只留初握、直接收场。抓住的那一下在真实接触点结算，落摔的高度用实际到达的高度。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体或方向／世界点，空握结束，不要求提交时存在敌人。攻击许可仍由命中层结算。
 *   提交后才触碰世界；准备期只 present。
 */
namespace PokemonSkills {
    const crushgripGripText = "world_combat.move.crushgrip.text.grip";
    const crushgripSlamText = "world_combat.move.crushgrip.text.slam";
    const crushgripMissText = "world_combat.move.crushgrip.text.miss";

    define({
        id: crushgripId,
        cooldownParameter: "recharge",
        name: "Crush Grip",
        description: "一只巨力手沿瞄准方向抓住第一个碰到的敌人：物攻与体重决定握力，对手此刻剩余的生命越满，这一握越重。它是三压招里最重、最慢、最贵，也是唯一会改变目标位置的一记——高举式把它整个人提起，只有真的举离地面才按住再砸回地面补一记固定伤害并短暂定身；没举起来（免疫位移或被顶住）就只算初握。原地式则一记捏完。",
        uses: ["用最重的一握捏掉满血目标的血条", "高举式把关键目标提起、按住再摔下", "用会改变目标位置的一握拆掉对手的站位"],
        kind: "aim",
        range: 2.6,
        maxRange: 5.2,
        prepare: 11,
        active: 18,
        recover: 9,
        cooldown: 30,
        style: "grip",
        defaults: { hoist: false, ai: { maxChase: 6, preferHealthy: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(crushgripId, "reach", pokemon) + 0.2, geometry: "line", style: "grip",
                color: 0x6E6A78, label: config && config.hoist === true ? "捏碎 · 高举式" : "捏碎 · 原地式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[crushgripId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(crushgripId, "tempo", context)),
                recover: Math.round(p(crushgripId, "aftercast", context)),
                cooldown: Math.round(p(crushgripId, "recharge", context)),
                active: skills[crushgripId].active,
                range: p(crushgripId, "reach", context) + 0.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_crushgrip:loom", crushgripScene, 1, action.origin(),
                JSON.stringify({ moment: "loom", hoist: config && config.hoist === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const landing = action.targetPosition();
            const heading = aim(action);
            const hoist = !!(config && config.hoist);
            const reach = Math.max(2.0, p(crushgripId, "reach", action));
            const radius = Math.max(0.5, p(crushgripId, "gripRadius", action));
            const motes = Math.max(10, Math.round(p(crushgripId, "motes", action)));
            const scale = radius / crushgripReference;
            const end = origin.plus(heading.scale(reach));
            const scenes = WorldFeedback.actionScenes(crushgripScene);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 空握：掌口合在空处或墙上，不结算任何东西。 */
            function miss(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, crushgripScene, 1, point,
                    { moment: "whiff", scale: scale, motes: Math.round(motes * 0.6) }, 18);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), crushgripMissText, [], 22);
                finish(current);
            }

            // 两掌沿瞄准方向合到第一个碰到的敌人身上；墙或空处只是空握。
            const grab = action.trace(origin, end, Math.min(1, radius));
            const grabbed = grab.hitEntity() ? grab.target() : null;
            if (grabbed === null || !world.valid(grabbed) || world.friendly(grabbed)) { miss(action, grab.position()); return; }
            const victim: CombatActor = grabbed;
            const power = p(crushgripId, "grip", action);
            const body = world.observe(victim);
            const at = body === null ? landing : body.position();
            WorldFeedback.emit(world, crushgripScene, 1, at,
                { moment: "grip", target: String(victim.ref()), motes: motes, scale: scale, hoist: hoist ? 1 : 0,
                    intensity: Math.max(0.6, Math.min(2.2, power / 100)) }, 30);
            const landed = hurt(action, victim, crushgripId, power,
                { damage: damageSpec(crushgripId, "grip"), contact: true, segment: "grip" });
            if (!landed) { WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), crushgripMissText, [], 22); finish(action); return; }
            sound(action, "minecraft:item.mace.smash_ground_heavy");
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), crushgripGripText, [], 24);
            if (!hoist || !world.valid(victim)) { finish(action); return; }

            const lift = p(crushgripId, "lift", action);
            const hold = Math.round(p(crushgripId, "hold", action));
            const drop = p(crushgripId, "drop", action);
            const slam = p(crushgripId, "slam", action);
            const holdTicks = Math.round(p(crushgripId, "holdTicks", action));
            const heldBody = world.observe(victim);
            if (heldBody === null) { finish(action); return; }
            const baseY = heldBody.boundsMin().y();
            const riseTicks = Math.max(2, Math.min(5, Math.round(hold / 2)));
            let peak = 0, phase = "rise", age = 0, holding = false, holdY = baseY, fallTicks = 0;

            function release(current: CombatAction): void {
                const scope = current.world(), held = scope.observe(victim);
                if (holding && scope.valid(victim)) scope.attribute(victim, "minecraft:generic.gravity", 0, "add_multiplied_total");
                holding = false;
                if (held !== null) WorldFeedback.emit(scope, crushgripScene, 1, held.position(),
                    { moment: "release", target: String(victim.ref()), motes: Math.round(motes * .7), scale: scale }, 18);
                finish(current);
            }

            // Initial launch is a received impulse: native cancellation, resistance and mounted restrictions apply.
            if (!world.hitImpulse(victim, WorldCombat.point(0, lift, 0))) { release(action); return; }

            /** The source owns the short grip; all control ends with this action, including interruption. */
            function hoistStep(current: CombatAction): void {
                const scope = current.world();
                if (!scope.valid(victim)) { finish(current); return; }
                const held = scope.observe(victim), holder = scope.observe(actor);
                if (held === null || holder === null) { release(current); return; }
                const offset = held.position().minus(holder.position());
                if (Math.sqrt(offset.x() * offset.x() + offset.z() * offset.z()) > reach + radius || !scope.clear(holder.position(), held.position())) { release(current); return; }
                const risen = held.boundsMin().y() - baseY;
                peak = Math.max(peak, risen);
                age++;
                if (phase === "rise") {
                    if (risen > .1) scenes.show(current, "rise", held.position(),
                        { moment: "rise", target: String(victim.ref()), scale: scale, lift: Math.max(0, held.velocity().y()) });
                    if (age >= riseTicks) {
                        if (risen < .1) { release(current); return; }
                        scenes.stop(current, "rise");
                        phase = "hold"; age = 0;
                        holdY = held.boundsMin().y();
                        holding = scope.attribute(victim, "minecraft:generic.gravity", -1, "add_multiplied_total");
                        if (!holding) { release(current); return; }
                        if (Math.abs(held.velocity().y()) > .01 && !scope.hitImpulse(victim,
                            WorldCombat.point(0, Math.max(-4, Math.min(4, -held.velocity().y())), 0))) { release(current); return; }
                        scenes.show(current, "hold", held.position(), { moment: "hoist", target: String(victim.ref()), scale: scale });
                    }
                    current.after(1, hoistStep);
                    return;
                }
                if (phase === "hold") {
                    const correction = holdY - held.boundsMin().y();
                    if (Math.abs(correction) > .02 && scope.hitDisplace(victim,
                        WorldCombat.point(0, Math.max(-4, Math.min(4, correction)), 0)) < .001) { release(current); return; }
                    if (age >= hold) {
                        scenes.stop(current, "hold");
                        scope.attribute(victim, "minecraft:generic.gravity", 0, "add_multiplied_total"); holding = false;
                        if (!scope.hitImpulse(victim, WorldCombat.point(0, -drop, 0))) { release(current); return; }
                        phase = "fall"; age = 0;
                        fallTicks = Math.max(hold, Math.ceil((peak + held.height()) / drop) * 2);
                        scenes.show(current, "fall", held.position(), { moment: "fall", target: String(victim.ref()), scale: scale });
                    }
                    current.after(1, hoistStep);
                    return;
                }
                // The second hit belongs to an observed landing after this grip's actual rise and fall.
                if (held.grounded() && peak - risen > .1) {
                    scenes.stop(current, "fall");
                    const point = held.position();
                    const landedSlam = hurt(current, victim, crushgripId, slam,
                        { damage: damageSpec(crushgripId, "slam"), contact: true, segment: "slam" });
                    if (landedSlam) {
                        if (scope.valid(victim)) WorldEffects.apply(scope, victim, "rooted", {}, holdTicks);
                        WorldFeedback.emit(scope, crushgripScene, 1, point,
                            { moment: "slam", target: String(victim.ref()), motes: motes, scale: scale,
                                drop: Math.round((peak - risen) * 100) / 100, intensity: Math.max(0.6, Math.min(2.0, slam / 60)) }, 30);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), crushgripSlamText, [], 24);
                        scope.sound("minecraft:item.mace.smash_ground_heavy", point, 14, "{}");
                    }
                    finish(current); return;
                }
                if (age >= fallTicks) { release(current); return; }
                current.after(1, hoistStep);
            }

            action.after(1, hoistStep);
        }
    });
}
