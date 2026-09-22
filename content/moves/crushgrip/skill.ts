/**
 * 捏碎 / crushgrip 的出手方式。
 *
 * 念头的形状：两片巨掌的轮廓在目标两侧浮出、张开（loom，提交前只播预告）→ 合拢捏住（grip）：命中一记随
 *   「目标完整度」结算的 `grip`；高举式再把它整个人提离地面（hoist）、按住 `hold` 刻，然后砸回地面（slam）
 *   补一记固定伤害并短暂定身（`holdTicks`）→ 手掌散去。
 * 两幕：捏 →（高举式才有）提与摔。只有高举式会改变目标的位置，让这招在场上和另外两记「原地加压」的招分开。
 * 提交后才触碰世界；准备期只 present。
 */
namespace PokemonSkills {
    const crushgripGripText = "world_combat.move.crushgrip.text.grip";
    const crushgripSlamText = "world_combat.move.crushgrip.text.slam";
    const crushgripMissText = "world_combat.move.crushgrip.text.miss";

    define({
        id: crushgripId,
        name: "Crush Grip",
        description: "The target is crushed with great force. The more HP the target has left, the greater the move's power.",
        uses: ["用最重的一握捏掉满血目标的血条", "高举式把关键目标提起、按住再摔下", "用会改变目标位置的一握拆掉对手的站位"],
        kind: "enemy",
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
            return { radius: p(crushgripId, "reach", pokemon) + 0.2, geometry: "circle", style: "grip",
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
            const target = action.target();
            const landing = action.targetPosition();
            const hoist = !!(config && config.hoist);
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, crushgripScene, 1, landing, { moment: "whiff" }, 18);
                WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.2, 0)), crushgripMissText, [], 22);
                done(action);
                return;
            }
            const power = p(crushgripId, "grip", action);
            const radius = Math.max(0.5, p(crushgripId, "gripRadius", action));
            const motes = Math.max(10, Math.round(p(crushgripId, "motes", action)));
            const scale = radius / crushgripReference;
            const body = world.observe(target);
            const at = body === null ? landing : body.position();
            WorldFeedback.emit(world, crushgripScene, 1, at,
                { moment: "grip", target: String(target.ref()), motes: motes, scale: scale, hoist: hoist ? 1 : 0,
                    intensity: Math.max(0.6, Math.min(2.2, power / 100)) }, 30);
            const landed = hurt(action, target, crushgripId, power,
                { damage: damageSpec(crushgripId, "grip"), contact: true });
            if (!landed) {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), crushgripMissText, [], 22);
                done(action);
                return;
            }
            sound(action, "minecraft:item.mace.smash_ground_heavy");
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), crushgripGripText, [], 24);
            if (hoist && world.valid(target)) {
                const lift = Math.max(0.3, p(crushgripId, "lift", action));
                const hold = Math.max(6, Math.round(p(crushgripId, "hold", action)));
                const drop = Math.max(0.35, p(crushgripId, "drop", action));
                const slam = Math.max(10, p(crushgripId, "slam", action));
                const holdTicks = Math.max(8, Math.round(p(crushgripId, "holdTicks", action)));
                world.motion(target, WorldCombat.point(0, lift, 0), false);
                WorldFeedback.emit(world, crushgripScene, 1, at,
                    { moment: "hoist", target: String(target.ref()), motes: motes, scale: scale, lift: lift }, 22);
                action.after(hold, function (current) {
                    const scope = current.world();
                    if (!scope.valid(target)) { done(current); return; }
                    scope.motion(target, WorldCombat.point(0, -drop, 0), false);
                    const landedSlam = hurt(current, target, crushgripId, slam,
                        { damage: damageSpec(crushgripId, "slam"), contact: true });
                    const now = scope.observe(target);
                    const point = now === null ? current.targetPosition() : now.position();
                    if (landedSlam) {
                        WorldEffects.apply(scope, target, "rooted", {}, holdTicks);
                        WorldFeedback.emit(scope, crushgripScene, 1, point,
                            { moment: "slam", target: String(target.ref()), motes: motes, scale: scale,
                                intensity: Math.max(0.6, Math.min(2.0, slam / 60)) }, 30);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), crushgripSlamText, [], 24);
                        scope.sound("minecraft:item.mace.smash_ground_heavy", point, 14, "{}");
                    }
                    done(current);
                });
                return;
            }
            done(action);
        }
    });
}
