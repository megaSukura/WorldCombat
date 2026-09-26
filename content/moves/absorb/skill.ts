/**
 * 吸取 / absorb 的出手方式。
 *
 * 核心念头：从身侧探出一根嫩藤轻点对手，点中就把一点汁液掸回自己身上——最短、最省、最快的一口。
 * 它不把任何东西送出去：藤始终连着施法者，藤的长度就是射程，画面上一眼能看出它从身上直接伸到了哪。
 *
 * 两幕：
 *   起（windup，提交前）：身侧收拢一圈青绿光点，只播预告。
 *   抽（reach → sip / miss，提交后）：`kind: "aim"` 可朝任意方向或世界点探藤，也能空放。先做一次权威
 *       `action.trace(..., true)`，藤尖画到真实首碰点（实体或方块），而不是画满整条 `reach`；撞上敌人且伤害成功
 *       才结算 `sip` 汲取——命中伤害的一半经共享 `drain` 载荷转回自身，同时沿「目标→自身」抽出一束汁流。
 *       墙与友方先挡住藤尖、不结算敌方伤害，伤害被拒就不再显示回流。
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

    /** 藤的折线顶点：两端落在施法者与真实首碰点，中间朝侧向微微鼓出，画出的就是判定真正走到的那条短藤。 */
    function absorbVine(origin: CombatPoint, tip: CombatPoint, segments: number, sag: number): number[][] {
        const path: number[][] = [[origin.x(), origin.y(), origin.z()]];
        const delta = tip.minus(origin);
        const horizontal = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
        const nx = horizontal < 0.001 ? 1 : -delta.z() / horizontal;
        const nz = horizontal < 0.001 ? 0 : delta.x() / horizontal;
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const at = origin.plus(delta.scale(t));
            const bulge = Math.sin(Math.PI * t) * sag;
            const droop = Math.sin(Math.PI * t) * sag * 0.45;
            path.push([at.x() + nx * bulge, at.y() - droop, at.z() + nz * bulge]);
        }
        path.push([tip.x(), tip.y(), tip.z()]);
        return path;
    }

    define({
        id: "absorb",
        cooldownParameter: "recharge",
        name: "Absorb",
        description: "朝瞄准方向探出一根短藤，点中敌人就汲取生命为自己恢复；可以空放，墙与友方会先挡下藤尖。",
        uses: ["贴身时用最短冷却的一口维持血量", "在小口伤害里顺手把血线拉回来", "够得着就点一口：起手、收招、冷却都短，节奏轻快"],
        kind: "aim",
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
            const actor = action.actor();
            const reach = p("absorb", "reach", action);
            const lash = p("absorb", "lash", action);
            const power = p("absorb", "sip", action);
            const share = p("absorb", "sap", action);
            const direction = aim(action);
            const origin = action.origin();
            const motes = Math.max(6, Math.round(power * 0.4 + share * 40));
            const scale = Math.max(0.7, lash / 0.36);
            const end = origin.plus(direction.scale(reach));

            // 权威判定先行：线的第一个实体（含友方与自身阻挡）或方块就是藤尖的真实落点。
            const hit = action.trace(origin, end, lash, true);
            const contact = hit.position();
            const lander = hit.hitEntity() ? hit.target() : null;
            const victim = lander !== null && !world.friendly(lander) && String(lander.ref()) !== String(actor.ref()) ? lander : null;
            const span = contact.minus(origin).length();
            const sag = Math.max(0.02, Math.min(0.32, span * 0.05));

            WorldFeedback.emit(world, absorbScene, 1, origin,
                { moment: "reach", path: absorbVine(origin, contact, 4, sag), point: [contact.x(), contact.y(), contact.z()],
                    span: span, motes: motes, scale: scale }, 16);
            sound(action, "cobblemon:move.absorb.actor");

            if (victim !== null && world.valid(victim)) {
                const landed = impact(action, hit, "absorb", power,
                    { damage: damageSpec("absorb", "sip"), drain: share });
                if (landed) {
                    const at = world.observe(victim);
                    const point = at === null ? contact : at.position();
                    const flow = origin.minus(point);
                    const run = flow.length();
                    const inward = run < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                    WorldFeedback.emit(world, absorbScene, 1, point,
                        { moment: "sip", path: ["target", "source"], target: String(victim.ref()),
                            direction: [inward.x(), inward.y(), inward.z()], span: run, motes: motes, scale: scale }, 26);
                    sound(action, "cobblemon:move.absorb.target");
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.05, 0)), absorbHitText, [], 22);
                    WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), absorbSapText, [Math.round(share * 100)], 22);
                }
            } else if (lander !== null) {
                // 友方（或自己）先挡住藤尖：停在身体上，不结算敌方伤害。
                WorldFeedback.emit(world, absorbScene, 1, contact, { moment: "miss", scale: scale }, 12);
            } else if (hit.blocked()) {
                const wall = hit.blockPosition();
                WorldFeedback.emit(world, absorbScene, 1, wall === null ? contact : wall, { moment: "miss", scale: scale }, 12);
            } else {
                WorldFeedback.emit(world, absorbScene, 1, contact, { moment: "miss", scale: scale }, 14);
                WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 0.8, 0)), absorbMissText, [], 18);
                sound(action, "minecraft:block.grass.break");
            }
            done(action);
        }
    });
}
