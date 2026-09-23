/**
 * 克命爪 / direclaw 的出手方式。
 *
 * 核心念头：一记深爪，三道爪痕同时犁开同一道伤口——爪上的余毒在收爪那一刻挑一种诅咒按进去。
 *   伤害只结算一次，状态只掷取一次；三选一的结果由爪上的毒决定，是这一招的身份。
 *
 * 两幕（外加一次结果）：
 *   起（windup，提交前）：爪锋压上毒液、三道冷光在身前亮起，只播预告，可被打断。
 *   撕（rake）：提交后朝目标一记 `rake` 接触爪击（暴击由本招自己的 `critChance` 掷取），并在伤口处画下三道爪痕。
 *   咒（venom／numb／drowse）：命中后按 `ailmentChance` 掷一次，从中毒／麻痹／睡眠里挑一种按进伤口
 *       （`favor` 可提前指定倾向）；目标免疫则只留一下毒雾。未命中只留散毒。
 *
 * 与同族分开：十字毒刃是两刃合拢、靠会渗的毒；克命爪是**一记深爪、一次掷取三选一**，伤害与状态都不拖泥带水。
 *
 * 命中、防御、相性走共享 `hurt`；暴击由本招的 `critChance` 经 `features.resolve` 交给共享结算；余毒走 `CombatStatus.inflict`。
 */
namespace PokemonSkills {
    /** 余毒身份 → 浮字键。 */
    function direclawAilmentText(name: string): string {
        if (name === "poison") return direclawPoisonText;
        if (name === "paralysis") return direclawParalysisText;
        return direclawSleepText;
    }
    /** 余毒身份 → 表现 moment（三色分开，画面才读得出中的是哪一种）。 */
    function direclawAilmentMoment(name: string): string {
        if (name === "poison") return "venom";
        if (name === "paralysis") return "numb";
        return "drowse";
    }
    /** 暴击由本招自己的几率掷取：命中瞬间在共享结算里决定是否暴击。 */
    function direclawCrit(chance: number): (context: PokemonDamage.FeatureContext) => PokemonDamage.Metadata | undefined {
        return function (context: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (context.preview || !context.world) return undefined;
            return { critical: context.world.random() < chance };
        };
    }
    /** 一条爪痕：伤口平面里从下往上、略带前倾的一段线，服务端与画面共用这组顶点。 */
    function direclawGash(centre: CombatPoint, lateral: CombatPoint, up: CombatPoint, offset: number, cleave: number): number[][] {
        const low = centre.plus(lateral.scale(offset)).plus(up.scale(-cleave * 0.45));
        const high = centre.plus(lateral.scale(offset)).plus(up.scale(cleave * 0.75));
        return [[low.x(), low.y(), low.z()], [high.x(), high.y(), high.z()]];
    }

    define({
        id: direclawId,
        cooldownParameter: "recharge",
        name: "Dire Claw",
        description: "A single deep claw rakes three gashes into one wound; the venom on the claw then presses one of poison, paralysis or sleep into the cut. It has a high chance to land a critical hit.",
        uses: ["近身一记深爪，把三选一的余毒按进伤口", "对高危目标指定留下睡眠", "对准要害打出更高暴击的一爪"],
        kind: "enemy",
        range: 2.8,
        maxRange: 4.0,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "venom",
        stationary: true,
        defaults: { deep: false, favor: 0, ai: { maxChase: 6, preferUnfazed: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[direclawId], detail: { values: config } };
            return { radius: p(direclawId, "reach", context), geometry: "line", style: "venom", color: 0x9BE86B,
                label: config && config.deep === true ? "克命爪·深创" : "克命爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[direclawId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(direclawId, "tempo", context)),
                recover: Math.round(p(direclawId, "aftercast", context)),
                cooldown: Math.round(p(direclawId, "recharge", context)),
                active: 0,
                range: p(direclawId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const venom = Math.max(10, Math.round(p(direclawId, "venom", action) * 0.5));
            action.present("direclaw:windup:" + action.id(), direclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, venom: venom,
                    deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const heading = aim(action);
            const target = action.target();
            const reach = Math.max(1.8, action.range());
            const power = p(direclawId, "rake", action);
            const chance = p(direclawId, "ailmentChance", action);
            const ticks = Math.max(40, Math.round(p(direclawId, "ailmentTicks", action)));
            const critChance = p(direclawId, "critChance", action);
            const cleave = Math.max(0.3, p(direclawId, "cleave", action));
            const wound = Math.max(0.2, p(direclawId, "wound", action));
            const venom = Math.max(10, Math.round(p(direclawId, "venom", action)));
            const gashes = Math.max(1, Math.round(p(direclawId, "gashes", action)));
            const favour = Math.max(0, Math.min(3, Math.round(Number(config && config.favor) || 0)));
            const scale = Math.max(0.6, Math.min(1.8, cleave / direclawReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 80));
            const lateral = WorldCombat.point(-heading.z(), 0, heading.x());
            const up = WorldCombat.point(0, 1, 0);

            const foeBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const centre = foeBody !== null ? foeBody.position() : origin.plus(heading.scale(reach));
            const gap = gashes > 1 ? wound * 2 / (gashes - 1) : 0;
            const primary = target !== null ? String(target.ref()) : "";

            if (foeBody === null) {
                WorldFeedback.emit(world, direclawScene, 1, centre, { moment: "miss", venom: venom, scale: scale }, 18);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)), direclawMissText, [], 20);
                done(action);
                return;
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            for (let index = 0; index < gashes; index++) {
                const offset = gashes > 1 ? -wound + gap * index : 0;
                WorldFeedback.emit(world, direclawScene, 1, centre,
                    { moment: "rake", path: direclawGash(centre, lateral, up, offset, cleave),
                        venom: venom, scale: scale, intensity: intensity, primary: index === Math.floor(gashes / 2) ? 1 : 0 }, 20);
            }

            const landed = hurt(action, target!, direclawId, power,
                { damage: damageSpec(direclawId, "rake"), contact: true, resolve: direclawCrit(critChance) });
            if (!landed) {
                WorldFeedback.emit(world, direclawScene, 1, centre, { moment: "miss", venom: venom, scale: scale }, 18);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)), direclawMissText, [], 20);
                done(action);
                return;
            }

            // 余毒：先掷一次是否留下，再按倾向或随机挑一种身份；免疫则只留毒雾。
            let ailment = "";
            if (world.random() < chance) {
                ailment = favour >= 1 ? direclawFavours[favour] : direclawFavours[1 + Math.floor(world.random() * 3)];
                const before = CombatStatus.has(world, target!, ailment);
                if (CombatStatus.inflict(world, target!, ailment, ticks, 0, { secondary: true }) && !before) {
                    WorldFeedback.emit(world, direclawScene, 1, centre,
                        { moment: direclawAilmentMoment(ailment), target: String(target!.ref()), venom: venom, scale: scale,
                            intensity: intensity }, 24);
                    world.sound("cobblemon:impact.poison", centre, 14, "{}");
                    WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)), direclawAilmentText(ailment), [], 24);
                    done(action);
                    return;
                }
            }
            WorldFeedback.emit(world, direclawScene, 1, centre,
                { moment: "wound", target: String(target!.ref()), venom: Math.round(venom * 0.6), scale: scale, intensity: intensity }, 20);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)),
                ailment ? direclawNoAilmentText : direclawHitText, [], 22);
            world.sound("cobblemon:impact.poison", centre, 14, "{}");
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记强调与浮字（暴击率来自本招的 critChance）。
    WorldCombat.on("world_combat:move_direclaw/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== direclawId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, direclawScene, 1, at,
            { moment: "crit", target: String(target.ref()), venom: 18, scale: 1.1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), direclawCritText, [], 28);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
