/**
 * 青草滑梯 / grassyglide 的出手方式。
 *
 * 核心念头：贴地滑出去，用身体把对手铲翻——**脚下已经有青草时**，草会把人托起来，起手直接归零、
 *   滑得更远更快。它不自己种草：借的是环境或其他招式已经铺好的青草场地，滑过处只翻起一层转瞬即逝的草叶。
 *
 * 两幕：
 *   起（windup，提交前）：脚边草叶收拢、身体压低，只播预告（present gather）；脚下真站在青草场地上时另播一记
 *       托举（present boost），那一记才代表起手归零、滑得更远更快。
 *   滑（execute）：提交后沿瞄准方向逐刻滑行，身后拖一条草浪；撞上第一个非友方活体就结算 slide 接触伤害、
 *       把它沿滑行方向铲开，并在接触处扬一撮短草（纯装饰，不留场地、不授青草身份）；
 *       一路滑到尽头没撞上就收势落空（whiff）。
 *
 * 自由瞄准：`kind: "aim"`，朝方向或世界点都能滑，空地也能放；没有输入辅助目标时照常滑出去并落空。
 * 草属性加成与共享草地结算由真正的青草场地承担，本招只读取共享身份 `world_combat:status/grassyterrain`。
 *
 * 与同族分开：电光一闪不留东西，水流喷射只浇透；青草滑梯的读法是草浪与「站在草上才能瞬发」的条件先制。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: grassyglideId,
        cooldownParameter: "recharge",
        name: "Grassy Glide",
        description: "贴地滑出去用身体铲对手：撞实造成接触伤害并把目标铲开。脚下有青草场地时草把人托起来，起手归零、滑得更远更快——这就是「必定先制」。它不自己种草，草浪只在滑落处扬起一撮。",
        uses: ["脚下有草时打一记瞬发的先手铲击", "贴上去滑过去，把目标铲开", "自由方向也能滑，落空不留下东西"],
        kind: "aim",
        range: 4.0,
        maxRange: 6.8,
        prepare: 3,
        active: 0,
        recover: 6,
        cooldown: 20,
        style: "grass",
        defaults: { ai: { maxChase: 7, finish: true, onGrass: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(grassyglideId, "dash", pokemon) : 4.0) + 0.4, geometry: "line", style: "grass", color: 0x7CCB5A,
                label: "青草滑梯" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[grassyglideId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(grassyglideId, "tempo", context)),
                recover: Math.round(p(grassyglideId, "settle", context)),
                cooldown: Math.round(p(grassyglideId, "recharge", context)),
                active: 0,
                range: p(grassyglideId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const onGrass = CombatStatus.has(action.sense(), action.actor(), "grassyterrain");
            const tufts = Math.max(12, Math.round(p(grassyglideId, "tufts", action)));
            action.present("grassyglide:gather", grassyglideScene, 1, action.origin(),
                JSON.stringify({ moment: onGrass ? "boost" : "gather", windup: prepare, onGrass: onGrass ? 1 : 0, tufts: tufts }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(grassyglideScene);
            const world = action.world();
            const direction = aim(action);
            const length = p(grassyglideId, "dash", action);
            const step = p(grassyglideId, "pace", action);
            const radius = p(grassyglideId, "collisionRadius", action);
            const power = p(grassyglideId, "slide", action);
            const push = p(grassyglideId, "push", action);
            const tufts = Math.max(12, Math.round(p(grassyglideId, "tufts", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            let travelled = 0;

            sound(action, "cobblemon:move.razorleaf.actor_1");
            movementScenes.show(action, "slide", action.origin(), { moment: "slide", scale: scale, tufts: tufts, intensity: intensity });

            function finish(current: CombatAction, at: CombatPoint, moment: string): void {
                const scope = current.world();
                if (moment === "whiff") {
                    WorldFeedback.emit(scope, grassyglideScene, 1, at, { moment: "whiff", scale: scale, tufts: tufts }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), grassyglideMissText, [], 22);
                    scope.sound("minecraft:entity.player.attack.sweep", at, 12, "{}");
                }
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, grassyglideId, power,
                            { damage: damageSpec(grassyglideId, "slide"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(origin);
                            if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                            // 落点只扬一撮短草做落痕，不铺场地、不授青草身份：青草场地仍由环境或其他招式提供。
                            WorldFeedback.emit(scope, grassyglideScene, 1, hit.position(),
                                { moment: "hit", target: String(victim.ref()), tufts: tufts, scale: scale, intensity: intensity }, 24);
                            WorldFeedback.emit(scope, grassyglideScene, 1, hit.position(),
                                { moment: "plant", tufts: Math.max(8, Math.round(tufts * 0.6)), scale: scale }, 18);
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.15, 0)), grassyglidePlantText, [], 24);
                            scope.sound("minecraft:block.grass.break", hit.position(), 12, "{}");
                        }
                        finish(current, hit.position(), "hit");
                    } else {
                        finish(current, current.origin(), "whiff");
                    }
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p(grassyglideId, "minimumMove", current) || travelled >= length) {
                    finish(current, current.origin(), "whiff");
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
