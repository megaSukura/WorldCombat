/**
 * 绞紧 / wringout 的出手方式。
 *
 * 念头的形状：施法者周身浮起螺旋气、朝目标收拢（coil，提交前只播预告）→ 一束螺旋力缠上目标、由脚到头拧紧
 *   （wring）：命中一记随「目标完整度」结算的 `wring` → 双绞式在 `gap` 刻后再拧一记（第二段按目标当时的血量
 *   重算、乘 `secondFactor`）→ 松手，流光散去。
 * 只有一幕正戏，但双绞式把它拉成两拍：第一拧读满血、第二拧读拧过之后还剩多少——总伤更高，但每一下都可能更轻。
 * 提交后才触碰世界；准备期只 present。
 */
namespace PokemonSkills {
    const wringoutWringText = "world_combat.move.wringout.text.wring";
    const wringoutTwinText = "world_combat.move.wringout.text.twin";
    const wringoutMissText = "world_combat.move.wringout.text.miss";

    define({
        id: wringoutId,
        cooldownParameter: "recharge",
        name: "Wring Out",
        description: "The user powerfully wrings the target. The more HP the target has, the greater the move's power.",
        uses: ["开局对满血的目标绞出最重的一记", "双绞式用第二拧补掉剩下的血量", "用特攻高的个体把整条血拧成伤害"],
        kind: "enemy",
        range: 2.5,
        maxRange: 3.5,
        prepare: 8,
        active: 16,
        recover: 7,
        cooldown: 24,
        style: "wring",
        defaults: { twin: false, ai: { maxChase: 6, preferHealthy: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(wringoutId, "reach", pokemon) + 0.2, geometry: "circle", style: "wring",
                color: 0x9A7BFF, label: config && config.twin === true ? "绞紧 · 双绞式" : "绞紧 · 单绞式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[wringoutId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(wringoutId, "tempo", context)),
                recover: Math.round(p(wringoutId, "aftercast", context)),
                cooldown: Math.round(p(wringoutId, "recharge", context)),
                active: skills[wringoutId].active,
                range: p(wringoutId, "reach", context) + 0.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_wringout:coil", wringoutScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", twin: config && config.twin === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, wringoutScene, 1, action.targetPosition(), { moment: "whiff" }, 18);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 1.2, 0)), wringoutMissText, [], 22);
                done(action);
                return;
            }
            const power = p(wringoutId, "wring", action);
            const radius = Math.max(0.6, p(wringoutId, "coilRadius", action));
            const coil = Math.max(10, Math.round(p(wringoutId, "coil", action)));
            const motes = Math.max(10, Math.round(p(wringoutId, "motes", action)));
            const scale = radius / wringoutReference;
            const twin = !!(config && config.twin);
            const landed = hurt(action, target, wringoutId, power,
                { damage: damageSpec(wringoutId, "wring"), contact: true });
            if (!landed) {
                WorldFeedback.emit(world, wringoutScene, 1, action.targetPosition(), { moment: "whiff" }, 18);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 1.2, 0)), wringoutMissText, [], 22);
                done(action);
                return;
            }
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            WorldFeedback.emit(world, wringoutScene, 1, at,
                { moment: "squeeze", target: String(target.ref()), motes: motes, scale: scale, coil: coil, pulse: 1,
                    intensity: Math.max(0.6, Math.min(2.2, power / 95)) }, Math.max(20, coil + 8));
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), wringoutWringText, [1], 22);
            sound(action, "minecraft:block.beacon.activate");
            if (twin && world.valid(target)) {
                const gap = Math.max(6, Math.round(p(wringoutId, "gap", action)));
                const second = Math.max(0.5, p(wringoutId, "secondFactor", action));
                action.after(gap, function (current) {
                    const scope = current.world();
                    if (!scope.valid(target)) { done(current); return; }
                    // 第二拧按目标此刻的血量重算，完整度系数自然落到「已经挨过一拧」的那个人身上。
                    const again = p(wringoutId, "wring", current) * second;
                    const landedTwice = hurt(current, target, wringoutId, again,
                        { damage: damageSpec(wringoutId, "wring"), contact: true });
                    const now = scope.observe(target);
                    const point = now === null ? current.targetPosition() : now.position();
                    if (landedTwice) {
                        WorldFeedback.emit(scope, wringoutScene, 1, point,
                            { moment: "squeeze2", target: String(target.ref()), motes: Math.round(motes * second),
                                scale: scale, coil: coil, pulse: 2, intensity: Math.max(0.5, Math.min(2.2, again / 95)) }, Math.max(20, coil + 8));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.25, 0)), wringoutTwinText, [], 22);
                        scope.sound("minecraft:block.beacon.activate", point, 14, "{}");
                    }
                    done(current);
                });
                return;
            }
            done(action);
        }
    });
}
