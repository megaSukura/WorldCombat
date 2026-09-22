/**
 * 硬压 / hardpress 的出手方式。
 *
 * 念头的形状：抬臂／抬钳（brace，提交前只播预告）→ 一腕自上方压到目标处（press）→ 落点范围内每个非友方吃一记
 *   随「目标完整度」结算的 `press`，被向下压沉 `sink`、沿背离方向顶开 `shove` → 压柱收束带起碎屑。
 * 只有一幕正戏：一次下压、一个结果，做透这一下就是全部。双腕式把掌面摊成一小片（可罩住挨着站的敌人），
 *   代价是单点威力更轻、起手与冷却更长；单腕式更窄更重、更快。
 * 提交后才触碰世界；准备期只 present。
 */
namespace PokemonSkills {
    const hardpressHitText = "world_combat.move.hardpress.text.press";
    const hardpressMissText = "world_combat.move.hardpress.text.miss";

    define({
        id: hardpressId,
        name: "Hard Press",
        description: "The user presses down on the target with an arm or a claw. The more HP the target has left, the greater the move's power.",
        uses: ["开局对满血的目标压出最重的一记", "双腕式一次按住挨着站的几个敌人", "用最快的循环一记接一记地压住对手"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.4,
        prepare: 7,
        active: 16,
        recover: 6,
        cooldown: 22,
        style: "press",
        defaults: { brace: false, ai: { maxChase: 6, preferHealthy: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(hardpressId, "reach", pokemon) + 0.2, geometry: "circle", style: "press",
                color: 0x9FB6C8, label: config && config.brace === true ? "硬压 · 双腕式" : "硬压 · 单腕式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[hardpressId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(hardpressId, "tempo", context)),
                recover: Math.round(p(hardpressId, "aftercast", context)),
                cooldown: Math.round(p(hardpressId, "recharge", context)),
                active: skills[hardpressId].active,
                range: p(hardpressId, "reach", context) + 0.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_hardpress:brace", hardpressScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", brace: config && config.brace === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world();
            const landing = action.targetPosition();
            const power = p(hardpressId, "press", action);
            const radius = Math.max(0.4, p(hardpressId, "pressRadius", action));
            const sink = Math.max(0, p(hardpressId, "sink", action));
            const shove = Math.max(0, p(hardpressId, "shove", action));
            const motes = Math.max(8, Math.round(p(hardpressId, "motes", action)));
            const intensity = Math.max(0.6, Math.min(2.2, power / 90));
            const scale = radius / hardpressReference;
            const region = WorldGeometry.ring(landing, 0, radius, { below: 2.2, above: 3.0 });
            let hits = 0;
            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                const landed = hurt(action, victim, hardpressId, power,
                    { damage: damageSpec(hardpressId, "press"), contact: true });
                if (!landed) return;
                hits++;
                const body = world.observe(victim);
                if (body === null) return;
                if (sink > 0) world.motion(victim, WorldCombat.point(0, -sink, 0), false);
                const away = facts.position().minus(landing);
                if (away.length() >= 0.05) world.displace(victim, away.unit().scale(shove));
                WorldFeedback.emit(world, hardpressScene, 1, body.position(),
                    { moment: "impact", target: String(victim.ref()), motes: motes,
                        pressure: hardpressRatioNow(world, victim), intensity: intensity }, 26);
            });
            WorldFeedback.emit(world, hardpressScene, 1, landing,
                { moment: "press", motes: motes, scale: scale, sink: sink, hits: hits,
                    brace: config && config.brace === true ? 1 : 0, intensity: intensity }, 32);
            sound(action, config && config.brace === true ? "minecraft:item.mace.smash_ground_heavy" : "minecraft:item.mace.smash_ground");
            WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.35, 0)),
                hits > 0 ? hardpressHitText : hardpressMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
