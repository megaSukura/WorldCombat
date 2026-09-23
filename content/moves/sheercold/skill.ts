/**
 * 绝对零度 / sheercold 的出手方式。
 *
 * 核心念头：把目标所在的那一小片空气骤然压低到绝对零度——一圈寒霜向四周铺开，圈内每个目标被一次冻毙，
 *   地上结起一层留一会儿的雪壳。它是这一族里唯一作用于一块半径、能同时放倒多个的一记，也是唯一
 *   「谁用」会影响出手快慢的一记：冰属性使用者结霜快得多。
 *
 * 两幕：
 *   起（windup，提交前）：施法者身上凝起白霜、脚下寒气打转，只播预告，可被打断。
 *   冻（mark → bloom / miss，提交后）：锁定目标脚下的圆并把它画出来，蓄势 `mark` 刻后整圈结霜；
 *       圈内每个非冰属性目标被 `sheercoldExecute` 一次冻毙，随后在地表覆一层 `frostTicks` 的雪壳
 *       （world.terrain 租约，replace 盖住自然地表、linger 活过招式）。
 *
 * 反制：走出那一圈、或本身就是冰属性；打断起手也让这一记白费。
 */
namespace PokemonSkills {
    define({
        id: sheercoldId,
        cooldownParameter: "recharge",
        name: "Sheer Cold",
        description: "把目标周围的那一小片空气骤然压到绝对零度：一圈寒霜向四周铺开，圈内每个目标被一次冻毙（一击必杀），地上留下一层短期雪壳。它是这一族里唯一能同时放倒多个的一记，也是唯一「谁用」会影响出手快慢的一记——冰属性使用者结霜快得多。",
        uses: ["一次冻毙目标周围一圈里的多个对手", "冰属性使用者用它抢出更短的出手窗口", "在地面留下一片短期寒霜标出冻区"],
        kind: "enemy",
        range: 2.6,
        maxRange: 5.2,
        prepare: 16,
        active: 0,
        recover: 12,
        cooldown: 95,
        style: "frost",
        defaults: { glacial: false, ai: { maxChase: 8, minFoes: 1, executionAbove: 0.2 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[sheercoldId], detail: { values: config } };
            return { radius: pokemon ? p(sheercoldId, "radius", context) : sheercoldReference, geometry: "circle", style: "frost",
                color: 0x7FD8E8, label: config && config.glacial === true ? "绝对零度·冰河" : "绝对零度·急冻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sheercoldId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(sheercoldId, "tempo", context)),
                recover: Math.round(p(sheercoldId, "aftercast", context)),
                cooldown: Math.round(p(sheercoldId, "recharge", context)),
                active: 0,
                range: p(sheercoldId, "radius", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.5) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sheercold:windup", sheercoldScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", glacial: config && config.glacial === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const body = target !== null && world.valid(target) ? world.observe(target) : null;
            const at = body !== null ? body.position() : action.targetPosition();
            const radius = Math.max(2.0, p(sheercoldId, "radius", action));
            const mark = Math.max(8, Math.round(p(sheercoldId, "mark", action)));
            const hush = Math.max(10, Math.round(p(sheercoldId, "hush", action)));
            const ticks = Math.max(80, Math.round(p(sheercoldId, "frostTicks", action)));
            const cells = Math.max(16, Math.round(p(sheercoldId, "frostCells", action)));
            const scale = radius / sheercoldReference;

            WorldFeedback.emit(world, sheercoldScene, 1, at,
                { moment: "mark", target: target === null ? "" : String(target.ref()), radius: radius, hush: hush, scale: scale }, mark + 24);
            sound(action, "minecraft:block.amethyst_block.resonate");

            action.after(mark, function (current: CombatAction) {
                const scope = current.world();
                let kills = 0, immune = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2.5, above: 2.5 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(current.actor().ref())) return;
                    const result = sheercoldExecute(current, enemy);
                    if (result === "kill") kills++;
                    else if (result === "immune") immune++;
                });
                const placed = sheercoldFrost(scope, at, radius, ticks, cells);
                WorldFeedback.emit(scope, sheercoldScene, 1, at,
                    { moment: "bloom", radius: radius, hush: hush, cells: placed, kills: kills, scale: scale }, 34);
                if (kills > 0) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), sheercoldKillText, [kills], 28);
                    scope.sound("cobblemon:impact.ice", at, 16, "{}");
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), immune > 0 ? sheercoldIceText : sheercoldMissText, [], 24);
                    scope.sound("minecraft:block.glass.break", at, 10, "{}");
                }
                done(current);
            });
        }
    });
}
