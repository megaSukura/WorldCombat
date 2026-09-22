/** 破壳：以双防等级换取攻、特攻和速度；壳片飞散由粒子表现。 */
namespace PokemonSkills {
    const shellsmashScene = "world_combat:move_shellsmash";
    const shellsmashText = "world_combat.move.shellsmash.text.broken";

    define({
        id: "shellsmash",
        name: "破壳",
        description: "撑裂自己的外壳，壳片向身周飞散：物攻、特攻、速度提高，防御与特防下降。彻底破壳提高增益与防御代价，起手和冷却也更长。",
        uses: ["开战前用防御换一波爆发", "在对手够不到的窗口里先破壳", "被围住时连壳一起炸开、赌一波速战速决"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "shatter",
        stationary: true,
        defaults: { total: false, ai: { minGap: 4, minHealth: 0.45 } },
        fields: [flag("total", "彻底破壳")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.0, p("shellsmash", "spread", pokemon)), geometry: "area", style: "shatter", color: 0xE8E2D0,
                label: config && config.total ? "破壳 · 彻底" : "破壳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shellsmash"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("shellsmash", "tempo", context)),
                recover: Math.round(p("shellsmash", "aftercast", context)),
                cooldown: Math.round(p("shellsmash", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shellsmash:strain", shellsmashScene, 1, action.origin(),
                JSON.stringify({ moment: "swell", total: config && config.total ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(3, Math.round(p("shellsmash", "surge", action))));
            const toll = Math.max(1, Math.min(2, Math.round(p("shellsmash", "toll", action))));
            const spread = Math.max(1.0, p("shellsmash", "spread", action));
            const shards = Math.max(10, Math.round(p("shellsmash", "shards", action)));
            const shardSize = Math.max(0.05, p("shellsmash", "shardSize", action));
            const shatter = Math.max(0.05, p("shellsmash", "shatter", action));
            const scale = spread / 1.8;
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));

            NativeEffects.boost(world, actor, "atk", gift);
            NativeEffects.boost(world, actor, "spa", gift);
            NativeEffects.boost(world, actor, "spe", gift);
            NativeEffects.boost(world, actor, "def", -toll);
            NativeEffects.boost(world, actor, "spd", -toll);

            WorldFeedback.emit(world, shellsmashScene, 1, body.position(),
                { moment: "crack", actor: String(actor.ref()), surge: gift, toll: toll, shards: shards, shardSize: shardSize,
                    shatter: shatter, spread: spread, scale: scale,
                    intensity: Math.max(0.8, Math.min(2.4, gift / 2 + shards / 30)) }, 30);
            WorldFeedback.emit(world, shellsmashScene, 1, feet,
                { moment: "shed", actor: String(actor.ref()), shards: shards, shardSize: shardSize, shatter: shatter,
                    spread: spread, scale: scale, intensity: Math.max(0.8, Math.min(2.4, shards / 26)) }, 34);
            WorldFeedback.emit(world, shellsmashScene, 1, feet,
                { moment: "settle", actor: String(actor.ref()), shards: Math.min(shards, 24), shardSize: shardSize, spread: spread, scale: scale }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), shellsmashText, [gift, toll], 30);
            world.sound("minecraft:block.anvil.land", body.position(), 16, "{}");
            world.sound("cobblemon:impact.rock", body.position(), 14, "{}");
            done(action);
        }
    });
}
