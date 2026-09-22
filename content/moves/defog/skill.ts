/**
 * 清除浓雾 / Defog —— 出手方式。
 *
 * 核心念头：以自身为轴旋起一圈清扫风，朝四面推出去；风圈扫过的地方，对手身上的屏障被整片抹掉、
 *   地上的烟与撒菱被掀走，圈里的对手被吹得门户大开。这是本族唯一「不打人、只打扫」的一招。
 *
 * 一幕半：
 *   起（windup，提交前）：脚边气流开始打旋、粉尘贴地聚起，预告这一圈风（`action.present`）。
 *   扫（burst → strip）：提交后风圈从自身向外铺开半径 `sweep`：圈里的非友方身上的反射壁、光墙、
 *     极光幕、白雾、神秘守护一起被解除（共享身份 `cure`），并被下降闪避等级 `strip` 与防御等级 `expose`，
 *     挂上共享身份 world_combat:status/defogged 的破绽；同时烟幕身份被从每个圈内活体身上吹散；
 *     风还掀掉圈内的烟幕场地与撒菱／隐形岩／黏网／毒菱场地。全程没有伤害、没有击退。
 *
 * 与同族分开：吹飞是把人沿风向推走的逐退，劈瓦是贴身一记把屏障震碎；只有清除浓雾是**以自身为轴、
 *   大范围、无伤害**的打扫——它抹掉的是「守势」而不是「位置」或「血量」。
 * 反制：风圈是以施法者为圆心的圆，站到半径之外就什么都不受影响；风也会顺手掀掉自方的撒菱与烟幕。
 */
namespace PokemonSkills {
    const defogScene = "world_combat:move_defog";
    const defogExposed = "world_combat:defog_exposed";
    const defogStripText = "world_combat.move.defog.text.strip";
    const defogClearText = "world_combat.move.defog.text.clear";
    const defogGustText = "world_combat.move.defog.text.gust";

    /** 共享身份：这一扫会从对手身上抹掉的屏障。 */
    const defogScreens = ["reflect", "lightscreen", "auroraveil", "mist", "safeguard"];
    /** 会被风掀掉的场地类别：烟幕、护幕与入场陷阱；由生产者声明，本招不枚举规则 id。 */
    const defogFieldTags = [WorldEffects.categories.haze, WorldEffects.categories.screen, WorldEffects.categories.hazard];

    /** 解除 actor 身上的一个屏障身份；返回真正移除的身份数。 */
    function defogPurgeActor(world: CombatWorld, actor: CombatActor): number {
        let removed = 0;
        for (let i = 0; i < defogScreens.length; i++) {
            const name = defogScreens[i];
            if (!CombatStatus.has(world, actor, name)) continue;
            if (CombatStatus.cure(world, actor, name)) removed++;
        }
        return removed;
    }

    /** 掀掉圆心周围 radius 内、声明为这些类别的场地；返回掀掉的场地数。 */
    function defogPurgeFields(world: CombatWorld, centre: CombatPoint, radius: number): number {
        let cleared = 0;
        for (let r = 0; r < defogFieldTags.length; r++) cleared += WorldEffects.clearTagged(world, defogFieldTags[r], centre, radius);
        return cleared;
    }

    define({
        id: "defog",
        name: "Defog",
        description: "以自身为轴旋起一圈清扫风：圈里对手的反射壁、光墙、极光幕、白雾与神秘守护被整片抹掉，"
            + "地上的烟幕与撒菱一并掀走，被扫到的对手门户大开（防御与闪避下降）。没有伤害，站到风圈之外就无事。",
        uses: ["把对手张开的屏障整片吹掉", "在被烟幕或撒菱困住时一场清干净", "给全队的下一轮攻击开一个破绽窗口"],
        kind: "self",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 30,
        style: "wind",
        stationary: true,
        defaults: { gale: false, ai: { maxChase: 10, minFoes: 2, leaveStation: true } },
        fields: [flag("gale", "烈风")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["defog"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("defog", "tempo", context)),
                recover: Math.round(p("defog", "aftercast", context)),
                cooldown: Math.round(p("defog", "recharge", context)),
                active: 1,
                range: p("defog", "sweep", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_defog:gather", defogScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", gale: config && config.gale === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["defog"], detail: { values: config } };
            return { radius: p("defog", "sweep", context), geometry: "area", style: "wind", color: 0xBFE4E8,
                label: config && config.gale === true ? "清除浓雾·烈风" : "清除浓雾" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position();
            const sweep = Math.max(4, p("defog", "sweep", action));
            const strip = Math.max(1, Math.min(3, Math.round(p("defog", "strip", action))));
            const expose = Math.max(1, Math.min(3, Math.round(p("defog", "expose", action))));
            const ticks = Math.max(90, Math.round(p("defog", "linger", action)));
            const motes = Math.max(12, Math.round(p("defog", "motes", action)));
            const scale = sweep / 6;
            let caught = 0, clipped = 0;

            sound(action, "minecraft:entity.breeze.whirl");
            WorldFeedback.emit(world, defogScene, 1, origin,
                { moment: "burst", radius: sweep, motes: motes, scale: scale }, 30);
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, sweep, { below: 3, above: 4 }), function (actor, facts) {
                if (String(actor.ref()) === String(self.ref())) return;
                // 风把眼里的烟也一并吹散：烟幕身份对谁都解除。
                if (CombatStatus.has(world, actor, "smoked")) CombatStatus.cure(world, actor, "smoked");
                if (facts.friendly()) return;
                caught++;
                const purged = defogPurgeActor(world, actor);
                clipped += purged;
                MobEffects.apply(world, actor, defogExposed, ticks, 0);
                NativeEffects.boost(world, actor, "evasion", -strip);
                NativeEffects.boost(world, actor, "def", -expose);
                WorldFeedback.emit(world, defogScene, 1, facts.position(),
                    { moment: "strip", target: String(actor.ref()), strip: strip, expose: expose,
                        purged: purged, motes: Math.max(8, Math.round(motes * 0.5)), scale: scale }, 26);
                WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.1, 0)), defogStripText, [strip, expose], 28);
            });
            const fields = defogPurgeFields(world, origin, sweep);
            sound(action, "minecraft:entity.breeze.wind_burst");
            WorldFeedback.emit(world, defogScene, 1, origin,
                { moment: "clear", radius: sweep, motes: motes, caught: caught, clipped: clipped, fields: fields, scale: scale }, 28);
            if (clipped + fields > 0)
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), defogClearText, [clipped, fields], 30);
            else
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), defogGustText, [caught], 26);
            done(action);
        }
    });
}
