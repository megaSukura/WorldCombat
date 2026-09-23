/**
 * 喷射拳 / jetpunch 的出手方式。
 *
 * 核心念头：站定不动，把水压缩在拳头上压成一条水柱，几乎瞬发地一记直拳打出去——拳程被水柱推出身外，
 *   命中把对手浇透、沿水柱方向冲退，带着火的目标被这一拳浇熄。全族唯一的拳水招。
 *
 * 两幕：
 *   起（windup，提交前）：水在拳上聚拢、压缩成一股，只播预告（present squeeze）。
 *   打（execute）：提交后朝目标方向做一次瞬时直线判定——撞上非友方活体就结算 torrent 接触伤害、
 *       把它浇透（共享身份 soaked）、沿水柱方向顶退；若它带着火或灼伤，这一拳把火浇熄。一路无人在射程线上就只是挥空（whiff）。
 *
 * 与同族分开：音速拳也是不位移的直拳，但没有水、拳程更短、不浇湿；水流喷射是把自己整个裹进水柱冲过去。
 *   喷射拳站着不动，水柱只裹拳，靠水花与水痕读出来。
 */
namespace PokemonSkills {
    define({
        id: jetpunchId,
        cooldownParameter: "recharge",
        name: "Jet Punch",
        description: "The user summons a torrent around its fist and punches at blinding speed. This move always goes first.",
        uses: ["贴身瞬发的先手重拳", "一拳把对手浇透并推离原位", "浇熄对手身上的火与灼伤"],
        kind: "enemy",
        range: 2.8,
        maxRange: 5.0,
        prepare: 1,
        active: 0,
        recover: 6,
        cooldown: 16,
        style: "jet",
        defaults: { hammer: false, ai: { maxChase: 6, preserveBurn: true, preferDry: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(jetpunchId, "reach", pokemon) : 2.8) + 0.4, geometry: "line", style: "jet", color: 0x3FA8E0,
                label: config && config.hammer === true ? "喷射拳·水锤" : "喷射拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[jetpunchId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(jetpunchId, "tempo", context)),
                recover: Math.round(p(jetpunchId, "settle", context)),
                cooldown: Math.round(p(jetpunchId, "recharge", context)),
                active: 0,
                range: p(jetpunchId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("jetpunch:squeeze", jetpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "squeeze", windup: prepare, hammer: config && config.hammer === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const reach = p(jetpunchId, "reach", action);
            const radius = p(jetpunchId, "burst", action);
            const power = p(jetpunchId, "torrent", action);
            const drive = p(jetpunchId, "drive", action);
            const drench = Math.max(20, Math.round(p(jetpunchId, "drench", action)));
            const spray = Math.max(12, Math.round(p(jetpunchId, "spray", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.42));
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            const origin = action.origin();
            const end = origin.plus(direction.scale(reach));

            sound(action, "cobblemon:move.watergun.actor");
            WorldFeedback.emit(world, jetpunchScene, 1, origin,
                { moment: "thrust", spray: spray, scale: scale, intensity: intensity, reach: reach, hammer: config && config.hammer === true ? 1 : 0 }, 20);

            const hit = action.trace(origin, end, radius);
            const victim = hit.target();
            if (hit.hitEntity() && victim !== null && world.valid(victim) && !world.friendly(victim)) {
                const landed = impact(action, hit, jetpunchId, power,
                    { damage: damageSpec(jetpunchId, "torrent"), contact: true, punch: true });
                const at = hit.position();
                WorldFeedback.emit(world, jetpunchScene, 1, at,
                    { moment: "hit", target: String(victim.ref()), spray: spray, scale: scale, intensity: intensity }, 24);
                world.sound("cobblemon:impact.water", at, 14, "{}");
                if (landed && world.valid(victim)) {
                    CombatStatus.apply(world, victim, "soaked", jetpunchDrenchedEffect, drench, 0, { unique: true });
                    const away = at.minus(origin);
                    if (away.length() > 0.05) world.displace(victim, away.unit().scale(drive));
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), jetpunchHitText, [Math.round(power)], 22);
                    if (CombatStatus.has(world, victim, "burn")) {
                        CombatStatus.cure(world, victim, "burn");
                        if (world.valid(victim)) world.ignite(victim, 0);
                        WorldFeedback.emit(world, jetpunchScene, 1, at, { moment: "douse", target: String(victim.ref()), scale: scale }, 26);
                        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), jetpunchDouseText, [], 24);
                        world.sound("minecraft:block.fire.extinguish", at, 14, "{}");
                    }
                }
                done(action);
                return;
            }
            WorldFeedback.emit(world, jetpunchScene, 1, end, { moment: "whiff", spray: spray, scale: scale }, 18);
            WorldFeedback.text(world, end.plus(WorldCombat.point(0, 1.0, 0)), jetpunchMissText, [], 20);
            world.sound("minecraft:entity.generic.splash", end, 12, "{}");
            done(action);
        }
    });
}
