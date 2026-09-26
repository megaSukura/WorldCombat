/**
 * 摇晃舞 / teeterdance —— 执行组织与载体行为。
 *
 * 核心念头：一场把节奏推出去的舞。施法者当场左右摇摆起来，舞圈内的每个活体（除自己）都被带进这个节奏：
 *   站不稳、走路会歪，出手也容易散。它不分敌我——连带盟友一起晃晕是它的代价，施法者自己反而不会中招。
 *
 * 出手：短起手（windup 播「起势」）后提交。
 * 命中：提交后舞圈整圈铺开；圈内每个非自己的活体挂上共享身份 world_combat:status/confusion 的
 *       world_combat:teeterdance_spin（物品栏可见、/effect 可用），并尝试当场带偏一步——只按原生 displace
 *       真正发生的位移表现；状态被免疫时既不挂效果也不画拖动。
 * 持续：被带进节奏的人每 12 刻尝试朝侧向小位移一次（摇晃走位），只有真正移动了才画轨迹，行动受限时不重复补写；
 *       并且每次想出手都有约 sway×0.9 的概率作废。
 * 结束：晃动随载体到期自然停止；牛奶、/effect clear 与清除类效果都能提前把它解掉。
 * 反制：舞圈以施法者为圆心，站到半径之外就什么都不受影响；它也会把盟友卷进来，被围住时反而不好放。
 *
 * 与同族的混乱分开：奇异之光／念力／喋喋不休的混乱让人「出手作废、打中反噬」；摇晃舞的混乱让人**摇晃走位**，
 * 失手只是附带。共享身份相同，行为各由生产方的载体承担——本单元只接管 id 为自己的载体。
 */
namespace PokemonSkills {
    function teeterdanceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    /** 本招自己的恍惚载体：只有代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function teeterdanceCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, teeterdanceStatus);
        return effect !== null && String(effect.id()) === teeterdanceEffect ? effect : null;
    }

    define({
        id: teeterdanceId,
        cooldownParameter: "recharge",
        name: "摇晃舞",
        description: "摇摇晃晃地跳起舞蹈：舞圈内除自己以外的每个活体都被带进节奏，陷入混乱——站不稳、走路会歪、出手容易散。不分敌我，会连带盟友一起晃晕；站到半径之外就不受影响。",
        uses: ["被围住时把一圈人一起晃晕", "打断贴身近战的走位与出手", "在人多的地方制造一片失衡"],
        kind: "self",
        range: 2.5,
        maxRange: 6,
        prepare: 12,
        active: 1,
        recover: 8,
        cooldown: 80,
        style: "dance",
        stationary: true,
        defaults: { careful: false, ai: { maxChase: 8, minFoes: 1 } },
        fields: [flag("careful", "顾友")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[teeterdanceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(teeterdanceId, "tempo", context)),
                recover: Math.round(p(teeterdanceId, "aftercast", context)),
                cooldown: Math.round(p(teeterdanceId, "recharge", context)),
                active: 1,
                range: p(teeterdanceId, "danceRadius", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[teeterdanceId], detail: { values: config } };
            return { radius: p(teeterdanceId, "danceRadius", context), geometry: "area", style: "dance", color: 0xB15CE0,
                label: config && config.careful === true ? "摇晃舞 · 顾友" : "摇晃舞" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_teeterdance:windup", teeterdanceScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", careful: config && config.careful === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const careful = !!(config && config.careful);
            const radius = Math.max(2.5, p(teeterdanceId, "danceRadius", action));
            const ticks = Math.max(60, Math.round(p(teeterdanceId, "dazeTicks", action)));
            const sway = Math.max(0.04, Math.min(0.2, p(teeterdanceId, "sway", action)));
            const amplifier = Math.max(1, Math.round(sway * 100));
            const beats = Math.max(2, Math.min(6, Math.round(p(teeterdanceId, "beats", action))));
            const motes = Math.max(12, Math.round(p(teeterdanceId, "motes", action)));
            const scale = radius / 4;
            let caught = 0;

            WorldFeedback.emit(world, teeterdanceScene, 1, centre,
                { moment: "dance", radius: radius, motes: motes, beats: beats, scale: scale, careful: careful ? 1 : 0,
                    intensity: Math.max(0.7, Math.min(2, motes / 28)) }, 30);

            WorldGeometry.select(world, WorldGeometry.ring(centre, 0, radius, { below: 3.5, above: 4 }), function (target, facts) {
                if (String(target.ref()) === String(actor.ref())) return;
                if (careful && facts.friendly()) return;
                if (!CombatStatus.apply(world, target, teeterdanceStatus, teeterdanceEffect, ticks, amplifier, { unique: true })) return;
                caught++;
                // 只尝试原生 displace，并按真正发生的位移表现；免疫或被挡住时不画拖动。
                const angle = world.random() * Math.PI * 2;
                const step = WorldCombat.point(Math.cos(angle) * sway, 0, Math.sin(angle) * sway);
                const from = facts.position();
                const moved = world.displace(target, step);
                const after = world.observe(target);
                const at = after === null ? from : after.position();
                WorldFeedback.emit(world, teeterdanceScene, 1, at,
                    { moment: "daze", target: String(target.ref()), motes: Math.max(8, Math.round(motes / 2)),
                        scale: scale, intensity: 1 }, 26);
                if (moved > 0.01) WorldFeedback.emit(world, teeterdanceScene, 1, from,
                    { moment: "sway", target: String(target.ref()), motes: Math.max(6, Math.round(moved * 60)),
                        scale: scale, moved: Math.round(moved * 100) / 100 }, 16);
            });

            // 一个都没带进节奏时，舞圈只空转一下：steady 就是那圈扑空的光点。
            if (caught === 0) WorldFeedback.emit(world, teeterdanceScene, 1, centre,
                { moment: "steady", radius: radius, scale: scale }, 20);

            WorldFeedback.text(world, teeterdanceAbove(centre),
                caught > 0 ? teeterdanceDazeText : teeterdanceSteadyText,
                caught > 0 ? [caught, Math.round(sway * 100 * teeterdanceFumbleFactor)] : [radius], 30);
            sound(action, "cobblemon:status.volatile.confusion.actor");
            world.sound("minecraft:block.note_block.pling", centre, 14, "{}");
            done(action);
        }
    });

    // 摇晃走位：被带进节奏的人每 12 刻朝侧向被带偏一小步；摇晃强度由载体振幅（sway 百分数）读回。
    WorldCombat.on("world_combat:move_teeterdance/sway", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== teeterdanceEffect || event.world().tick() % teeterdanceInterval !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const effect = MobEffects.read(world, actor, teeterdanceEffect);
        if (effect === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const velocity = body.velocity();
        let heading = WorldCombat.point(velocity.x(), 0, velocity.z());
        if (heading.length() < 0.02) heading = WorldCombat.point(1, 0, 0);
        heading = heading.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const sign = Math.floor(world.tick() / teeterdanceInterval) % 2 === 0 ? 1 : -1;
        const strength = Math.max(0.04, Math.min(0.2, effect.amplifier() / 100));
        const step = side.scale(strength * sign);
        const from = body.position();
        // 只尝试原生 displace，按真正发生的位移表现；被挡住或抵抗时这一步不产生任何轨迹。
        const moved = world.displace(actor, step);
        if (!(moved > 0.01)) return;
        const after = world.observe(actor);
        const at = after === null ? from : after.position();
        WorldFeedback.emit(world, teeterdanceScene, 1, at,
            { moment: "sway", target: String(actor.ref()), motes: Math.max(6, Math.round(moved * 60)),
                scale: 1, moved: Math.round(moved * 100) / 100 }, 16);
    });

    // 出手容易散：被带进节奏的人每次试图出手按振幅掷骰；中则本次出手作废。
    WorldCombat.on("world_combat:move_teeterdance/fumble", "world_combat:before_commit", "", function (event) {
        const world = event.world(), actor = event.actor();
        const effect = teeterdanceCarrier(world, actor);
        if (effect === null) return;
        const chance = Math.max(0.05, Math.min(0.25, effect.amplifier() / 100 * teeterdanceFumbleFactor));
        if (world.random() >= chance) return;
        event.reject("world_combat:teeterdance");
    });
}
