/** 破壳：以双防等级换取攻、特攻和速度；壳片飞散由粒子表现。 */
namespace PokemonSkills {
    const shellsmashScene = "world_combat:move_shellsmash";
    const shellsmashText = "world_combat.move.shellsmash.text.broken";

    define({
        id: "shellsmash",
        cooldownParameter: "wait",
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
            const bodyR = Math.max(0.3, Math.min(1.6, body.width() * 0.5));
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            // 壳片从体表以 shatter 的速度飞出；spread 是落点行程，用距离 / 速度折算飞行刻数，落地与落尘共用同一时刻。
            const flight = Math.max(8, Math.min(48, Math.round(spread / shatter)));

            // 实际变化才算数：能力阶梯封顶/封底、防降免疫与替换都会让收益或代价小于标称值。
            const gainAtk = NativeEffects.boost(world, actor, "atk", gift);
            const gainSpA = NativeEffects.boost(world, actor, "spa", gift);
            const gainSpe = NativeEffects.boost(world, actor, "spe", gift);
            const dropDef = -NativeEffects.boost(world, actor, "def", -toll);
            const dropSpD = -NativeEffects.boost(world, actor, "spd", -toll);
            const gained = Math.max(0, gainAtk) + Math.max(0, gainSpA) + Math.max(0, gainSpe);

            WorldFeedback.emit(world, shellsmashScene, 1, body.position(),
                { moment: "crack", actor: String(actor.ref()), shards: shards, shardSize: shardSize,
                    shatter: shatter, bodyR: bodyR,
                    intensity: Math.max(0.8, Math.min(2.4, gained / 6 + shards / 30)) }, 30);
            WorldFeedback.emit(world, shellsmashScene, 1, feet,
                { moment: "shed", actor: String(actor.ref()), shards: shards, shardSize: shardSize, shatter: shatter,
                    bodyR: bodyR, flight: flight,
                    intensity: Math.max(0.8, Math.min(2.4, shards / 26)) }, Math.max(48, flight + 24));
            WorldFeedback.emit(world, shellsmashScene, 1, feet,
                { moment: "settle", actor: String(actor.ref()), shards: Math.min(shards, 24), shardSize: shardSize,
                    spread: spread, bodyR: bodyR, flight: flight }, Math.max(48, flight + 24));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), shellsmashText,
                [Math.max(0, gainAtk), Math.max(0, gainSpA), Math.max(0, gainSpe), Math.max(0, dropDef), Math.max(0, dropSpD)], 30);
            world.sound("minecraft:block.anvil.land", body.position(), 16, "{}");
            world.sound("cobblemon:impact.rock", body.position(), 14, "{}");
            done(action);
        }
    });
}
