/**
 * 断头钳 / guillotine 的出手方式。
 *
 * 核心念头：大钳从两侧张开、罩住身前那一段扇形，合拢一刻还在钳口里的目标被一次夹断。
 *   它最短、最快，代价是收招最久——贴身用，夹中就结束，夹空就要在原地晾上一会儿。
 *
 * 两幕：
 *   起（windup，提交前）：钳口缓缓张开、齿缝里透出寒光，只播预告，可被打断。
 *   夹（mark → snap / miss，提交后）：锁定身前的扇形并把它画出来，蓄势 `mark` 刻后合拢；
 *       扇形内最近的一个非友方目标被 `guillotineExecute` 一次夹断，钳口合在空处则只留下一声脆响。
 *
 * 反制：离开身前这段扇形（绕后、拉开）、或换成幽灵属性；打断起手也让这一记白费。
 */
namespace PokemonSkills {
    define({
        id: guillotineId,
        name: "Guillotine",
        description: "A vicious tearing attack with big pincers. The target faints instantly if this attack hits.",
        uses: ["贴身用最短的起手夹断一个目标", "夹住正前方扇形里最近的一个对手", "夹空后要承担最久的收招，用时机换爆发"],
        kind: "enemy",
        range: 2.4,
        maxRange: 4.2,
        prepare: 10,
        active: 0,
        recover: 16,
        cooldown: 80,
        style: "pincer",
        defaults: { wide: false, ai: { maxChase: 5, executionAbove: 0.2 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[guillotineId], detail: { values: config } };
            return { radius: pokemon ? p(guillotineId, "span", context) : guillotineReference, geometry: "cone", style: "normal",
                color: 0xB0A48C, label: config && config.wide === true ? "断头钳·阔钳" : "断头钳·窄钳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[guillotineId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(guillotineId, "tempo", context)),
                recover: Math.round(p(guillotineId, "aftercast", context)),
                cooldown: Math.round(p(guillotineId, "recharge", context)),
                active: 0,
                range: p(guillotineId, "span", context) + 0.2
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.4) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_guillotine:windup", guillotineScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const origin = action.origin(), direction = aim(action);
            const span = Math.max(1.8, p(guillotineId, "span", action));
            const arc = Math.max(90, p(guillotineId, "arc", action));
            const mark = Math.max(6, Math.round(p(guillotineId, "mark", action)));
            const grip = Math.max(10, Math.round(p(guillotineId, "grip", action)));
            const scale = span / guillotineReference;
            const targetRef = target === null ? "" : String(target.ref());
            const front = origin.plus(direction.scale(span));

            WorldFeedback.emit(world, guillotineScene, 1, origin,
                { moment: "mark", target: targetRef, direction: [direction.x(), direction.y(), direction.z()],
                    span: span, arc: arc, grip: grip, scale: scale }, mark + 20);
            sound(action, "minecraft:entity.player.attack.sweep");

            action.after(mark, function (current: CombatAction) {
                const scope = current.world();
                const region = WorldGeometry.sector(current.origin(), direction, span, arc, { below: 2, above: 3 });
                let victim: CombatActor | null = null, at = front;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    if (victim !== null) return;
                    if (String(enemy.ref()) === String(current.actor().ref())) return;
                    victim = enemy;
                    at = facts.position();
                });
                const result = victim === null ? "miss" : guillotineExecute(current, victim);
                if (result === "kill") {
                    WorldFeedback.emit(scope, guillotineScene, 1, at,
                        { moment: "snap", target: String(victim!.ref()), grip: grip, scale: scale }, 30);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), guillotineKillText, [], 28);
                    scope.sound("cobblemon:impact.normal", at, 16, "{}");
                    scope.sound("minecraft:entity.player.attack.strong", at, 14, "{}");
                } else {
                    WorldFeedback.emit(scope, guillotineScene, 1, front,
                        { moment: "miss", direction: [direction.x(), direction.y(), direction.z()], span: span, arc: arc, grip: grip, scale: scale }, 22);
                    WorldFeedback.text(scope, front.plus(WorldCombat.point(0, 0.9, 0)), guillotineMissText, [], 22);
                    scope.sound("minecraft:item.shield.break", front, 10, "{}");
                }
                done(current);
            });
        }
    });
}
