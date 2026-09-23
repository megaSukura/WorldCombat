/**
 * 庆祝 / celebrate —— 执行组织。
 *
 * 核心念头：为十分开心的你办一场会传染的庆祝。施法者原地撒出一圈彩带与礼花，身边所有友方（含自己）
 *   都被这份欢喜感染，带上一段共享身份 world_combat:status/celebrate 的「庆祝中」状态；
 *   这份欢喜要么让人兴奋（速度 +1 级），要么当场分掉一份体力（按各自最大生命回复），由配置决定。
 *   它对敌人完全无效——是这一族里唯一只给自己的队伍、也最便宜的一招。
 *
 * 三幕：
 *   起（windup，提交前）：原地蹦起、礼花筒扶正，只播预告，可被打断。
 *   庆（execute）：提交后彩带整圈撒开，半径内的友方逐个被点亮；每个人的结果由 vigor 决定。
 *   续（recover 与状态存续期）：被庆祝到的人每 20 刻在头顶浮起一小簇彩带，直到这段欢喜结束。
 *
 * 能力提升走 NativeEffects.boost（宝可梦写原生等级、其他活体写公共能力阶梯），
 * 回复走共享的 heal 入口（同样覆盖两种对象）。
 */
namespace PokemonSkills {
    function celebrateAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    define({
        id: celebrateId,
        cooldownParameter: "recharge",
        name: "庆祝",
        description: "为十分开心的你办一场庆祝：原地撒出彩带与礼花，身边所有友方（含自己）都被感染，带上一段「庆祝中」状态。助兴式让人兴奋（速度 +1 级），慰劳式当场分掉一份体力。对敌人完全无效。",
        uses: ["开团前把身边的队友一起抬一手", "险境里给整队分一份体力喘口气", "只花很少的代价把士气铺满一圈"],
        kind: "self",
        range: 3,
        maxRange: 7,
        prepare: 6,
        active: 1,
        recover: 7,
        cooldown: 70,
        style: "party",
        stationary: true,
        defaults: { vigor: false, ai: { maxChase: 14, minAllies: 1, leaveStation: false } },
        fields: [flag("vigor", "慰劳")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[celebrateId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(celebrateId, "tempo", context)),
                recover: Math.round(p(celebrateId, "aftercast", context)),
                cooldown: Math.round(p(celebrateId, "recharge", context)),
                active: 1,
                range: p(celebrateId, "partyRadius", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[celebrateId], detail: { values: config } };
            return { radius: p(celebrateId, "partyRadius", context), geometry: "area", style: "party", color: 0xFFC24D,
                label: config && config.vigor === true ? "庆祝 · 慰劳" : "庆祝 · 助兴" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_celebrate:cheer", celebrateScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", vigor: config && config.vigor === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(2.5, p(celebrateId, "partyRadius", action));
            const ticks = Math.max(60, Math.round(p(celebrateId, "spiritTicks", action)));
            const confetti = Math.max(16, Math.round(p(celebrateId, "confetti", action)));
            const streamers = Math.max(2, Math.round(p(celebrateId, "streamers", action)));
            const mendFrac = Math.max(0.01, p(celebrateId, "mend", action));
            const vigor = !!(config && config.vigor);
            const scale = radius / 4;
            let party = 0, mended = 0;

            WorldFeedback.emit(world, celebrateScene, 1, centre,
                { moment: "burst", radius: radius, motes: confetti, streamers: streamers, scale: scale,
                    vigor: vigor ? 1 : 0, intensity: Math.max(0.7, Math.min(2, confetti / 34)) }, 40);

            WorldGeometry.select(world, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 4 }), function (target, facts) {
                const self = String(target.key()) === String(actor.key());
                if (!self && !facts.friendly()) return;
                if (MobEffects.apply(world, target, celebrateEffect, ticks, 0) === null) return;
                party++;
                if (vigor) mended += heal(world, target, mendFrac, "celebrate");
                else NativeEffects.boost(world, target, "spe", 1);
                WorldFeedback.emit(world, celebrateScene, 1, facts.position(),
                    { moment: "cheer", target: String(target.ref()), motes: Math.max(8, Math.round(confetti / 3)),
                        scale: scale, intensity: 1 }, 28);
            });

            WorldFeedback.text(world, celebrateAbove(centre),
                vigor ? celebrateMendText : celebrateCheerText,
                vigor ? [party, Math.round(mended * 10) / 10] : [party], 34);
            sound(action, "minecraft:entity.evoker.celebrate");
            world.sound("minecraft:block.note_block.chime", centre, 14, "{}");
            done(action);
        }
    });

    // 庆祝存续期：被感染的人每 20 刻在头顶浮起一小簇彩带（低密度、在视线之上，让出目标本体）。
    WorldCombat.on("world_combat:move_celebrate/sparkle", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== celebrateEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, celebrateEffect) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_celebrate/sparkle/" + String(actor.ref()), celebrateScene, 1, body.position(),
            { moment: "mark", target: String(actor.ref()), motes: 10, scale: 1 }, 40);
    });
}
