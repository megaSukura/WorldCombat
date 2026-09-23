/**
 * 高速移动 / agility — 执行组织。
 *
 * 核心念头：把全身的力一下子卸掉，身体变轻，脚下一圈风先收再炸——你比周围先动了一拍。
 *
 * 一幕半：
 *   松（windup 播「聚风」，提交前只观察与预告，打断不花代价）。
 *   弹（提交后）：NativeEffects.boost(spe, gift) 立刻写入公共能力阶梯，挂上共享身份
 *     world_combat:status/agility 的「轻身」窗口，播放一次向外的风爆与地环，随后窗口内留着残影拖尾。
 * 反制：起手极短但仍在提交前，抢一次打断能白赚；重施受冷却与轻身窗口限制，不会空烧 PP。
 */
namespace PokemonSkills {
    const agilityScene = "world_combat:move_agility";
    const agilityRush = "world_combat:agility_rush";
    const agilityText = "world_combat.move.agility.text.rush";
    /** 表现里的参考半径：`data.scale = 实际风爆半径 / 这个数`，让地环与判定同半径。 */
    const agilityReferenceRadius = 0.9;

    define({
        id: "agility",
        cooldownParameter: "wait",
        name: "高速移动",
        description: "大幅提高速度等级，并留下一段「轻身」余韵。",
        uses: ["开场先松劲，把速度垫起来", "在被追上之前抢先拉开", "在连打之间随手补一档速度"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 4,
        cooldown: 60,
        style: "gust",
        defaults: { ai: { maxChase: 14, minGap: 3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("agility", "surge", pokemon), geometry: "area", style: "gust", color: 0x8FE3F5,
                label: "高速移动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["agility"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("agility", "tempo", context)),
                recover: Math.round(p("agility", "aftercast", context)),
                cooldown: Math.round(p("agility", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_agility:gather", agilityScene, 1, action.origin(),
                JSON.stringify({ moment: "gather" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(2, Math.min(3, Math.round(p("agility", "gift", action))));
            const surge = Math.max(0.7, p("agility", "surge", action));
            const motes = Math.max(16, Math.round(p("agility", "motes", action)));
            const window = Math.max(60, Math.round(p("agility", "rushTicks", action)));
            const scale = surge / agilityReferenceRadius;
            NativeEffects.boost(world, actor, "spe", gift);
            MobEffects.apply(world, actor, agilityRush, window, 0);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, agilityScene, 1, feet,
                { moment: "burst", actor: String(actor.ref()), gift: gift, surge: surge, motes: motes, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, gift / 2 + 0.4)) }, 30);
            WorldFeedback.keep(world, "agility:wake:" + String(actor.ref()), agilityScene, 1, body.position(),
                { moment: "wake", actor: String(actor.ref()), motes: motes, scale: scale }, Math.min(window, 200));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), agilityText, [gift], 30);
            world.sound("cobblemon:move.quickattack.actor", body.position(), 16, "{}");
            done(action);
        }
    });
}
