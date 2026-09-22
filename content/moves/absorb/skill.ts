/**
 * 吸取 / absorb 的出手方式。
 *
 * 核心念头：从身侧探出一根嫩藤轻点对手，点中就把一点汁液掸回自己身上——最短、最省、最快的一口。
 * 它不把任何东西送出去：藤始终连着施法者，藤的长度就是射程，画面上一眼能看出它从身上直接伸到了哪。
 *
 * 两幕：
 *   起（windup，提交前）：身侧收拢一圈青绿光点，只播预告。
 *   抽（reach → sip / miss，提交后）：沿瞄准方向 trace 一条 `reach` 长的藤；撞上活体即结算 `sip` 汲取伤害，
 *       命中伤害的一半经共享 `drain` 载荷转回自身，同时沿「目标→自身」抽出一束汁流；撞空则藤尖在尽头散开。
 *
 * 与同族分开：超级吸取把孢荚抛出去、终极吸取从地里拱出大根三拍连抽、木角用身体撞进去；
 * 只有吸取是藤不脱手的一啄，靠"藤从身上伸出去"这件事被认出。
 *
 * 命中、防御、相性与暴击走共享 `impact`；回复走共享伤害载荷的 `drain`，对宝可梦、原版生物、玩家同一条路。
 */
namespace PokemonSkills {
    const absorbScene = "world_combat:move_absorb";
    const absorbHitText = "world_combat.move.absorb.text.hit";
    const absorbSapText = "world_combat.move.absorb.text.sap";
    const absorbMissText = "world_combat.move.absorb.text.miss";

    define({
        id: "absorb",
        name: "Absorb",
        description: "A nutrient-draining attack. The user's HP is restored by up to half the damage taken by the target.",
        uses: ["贴身时用最短冷却的一口维持血量", "在小口伤害里顺手把血线拉回来", "够得着就点一下，不打断自己的走位"],
        kind: "enemy",
        range: 4.0,
        maxRange: 6.6,
        prepare: 5,
        active: 1,
        recover: 5,
        cooldown: 20,
        style: "grass",
        defaults: { grasp: false, ai: { maxChase: 7, healBelow: 0.9 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("absorb", "reach", pokemon), geometry: "line", style: "grass", color: 0x7CB342,
                label: config && config.grasp === true ? "吸取·缠根" : "吸取" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["absorb"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("absorb", "tempo", context)),
                recover: Math.round(p("absorb", "aftercast", context)),
                cooldown: Math.round(p("absorb", "recharge", context)),
                active: 1,
                range: p("absorb", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:absorb:" + action.id(), absorbScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", grasp: config && config.grasp === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const reach = p("absorb", "reach", action);
            const lash = p("absorb", "lash", action);
            const power = p("absorb", "sip", action);
            const share = p("absorb", "sap", action);
            const direction = aim(action);
            const origin = action.origin();
            const motes = Math.max(6, Math.round(power * 0.4 + share * 40));
            const scale = lash / 0.36;
            const end = origin.plus(direction.scale(reach));

            WorldFeedback.emit(world, absorbScene, 1, origin,
                { moment: "reach", path: ["source", [end.x(), end.y(), end.z()]], direction: [direction.x(), direction.y(), direction.z()],
                    span: reach, motes: motes }, 18);
            sound(action, "cobblemon:move.absorb.actor");

            const hit = action.trace(origin, end, lash);
            const target = hit.target();
            if (hit.hitEntity() && target !== null && !world.friendly(target)) {
                const at = hit.position();
                const landed = impact(action, hit, "absorb", power,
                    { damage: damageSpec("absorb", "sip"), drain: share });
                const flow = origin.minus(at);
                const span = flow.length();
                const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                WorldFeedback.emit(world, absorbScene, 1, at,
                    { moment: "sip", path: ["target", "source"], target: String(target.ref()),
                        direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes }, 26);
                sound(action, "cobblemon:move.absorb.target");
                if (landed) {
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.05, 0)), absorbHitText, [], 22);
                    WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), absorbSapText, [Math.round(share * 100)], 22);
                }
            } else {
                WorldFeedback.emit(world, absorbScene, 1, end, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, end.plus(WorldCombat.point(0, 0.8, 0)), absorbMissText, [], 18);
                sound(action, "minecraft:block.grass.break");
            }
            done(action);
        }
    });
}
