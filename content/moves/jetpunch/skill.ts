/**
 * 喷射拳 / jetpunch 的出手方式。
 *
 * 核心念头：站定不动，把水压缩在拳头上压成一条水柱，几乎瞬发地一记直拳打出去——拳程被水柱推出身外，
 *   命中把对手浇透、沿水柱方向冲退，带着火的目标被这一拳浇熄。全族唯一的拳水招。
 *
 * 两幕：
 *   起（windup，提交前）：水在拳上聚拢、压缩成一股，只播预告（present squeeze）。
 *   打（execute）：提交后朝瞄准方向（或世界点方向）做一次瞬时直线判定——
 *       撞上第一个非友方活体就结算 `torrent` 接触伤害、把它浇透（共享身份 soaked）、沿水柱方向顶退；
 *       若它带着火或灼伤，这一拳把火浇熄。若玩家**明确选中一个友方**，则只走无伤支援：把对方身上的火浇熄，
 *       不造成任何伤害；默认方向下的友方不会被误伤（伤害权限由命中层判定）。一路无人在射程线上就只是挥空（whiff）。
 *
 * 与同族分开：音速拳也是不位移的直拳，但没有水、拳程更短、不浇湿；水流喷射是把自己整个裹进水柱冲过去。
 *   喷射拳站着不动，水柱只裹拳，靠水花与水痕读出来，还能替着火的同伴洗一把。
 */
namespace PokemonSkills {
    define({
        id: jetpunchId,
        cooldownParameter: "recharge",
        name: "Jet Punch",
        description: "站定不动，把水压缩在拳上压成一条水柱，几乎瞬发地一记直拳打出去：拳程被水柱推出身外，命中把对手浇透、沿水柱方向冲退，带着灼伤的目标还会被这一拳浇熄。明确选中着火的同伴时改为无伤浇灭，不造成伤害。全族唯一的拳水招。",
        uses: ["贴身瞬发的先手重拳", "一拳把对手浇透并推离原位", "替着火的同伴浇灭身上的火（明确选中友方，无伤）"],
        kind: "aim",
        range: 2.8,
        maxRange: 5.0,
        prepare: 1,
        active: 0,
        recover: 6,
        cooldown: 16,
        style: "jet",
        defaults: { hammer: false, helpFriends: true, ai: { maxChase: 6, preserveBurn: true, preferDry: true, finish: true, cureAllies: true } },
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
            const actor = action.actor();
            const selected = action.target();
            const direction = aim(action);
            // 指示、友方距离与拳程统一取同一个实际射程（resolve 已含 +0.4）。
            const reach = Math.max(1.6, action.range());
            const radius = p(jetpunchId, "burst", action);
            const power = p(jetpunchId, "torrent", action);
            const drive = p(jetpunchId, "drive", action);
            const drench = Math.max(20, Math.round(p(jetpunchId, "drench", action)));
            const spray = Math.max(12, Math.round(p(jetpunchId, "spray", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.42));
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            const origin = action.origin();
            const end = origin.plus(direction.scale(reach));
            const hammer = config && config.hammer === true;

            const friend = selected !== null && world.valid(selected) && world.friendly(selected)
                && String(selected.ref()) !== String(actor.ref());
            const friendBody = friend ? world.observe(selected!) : null;
            const friendAt = friend ? (friendBody !== null ? friendBody.position() : action.targetPosition()) : null;
            // 拳线裁到真实首碰：命中实体/墙体就用实际接触点，平地空击才到满拳程；友方则画到真实友方点。
            const hit = friend ? null : action.trace(origin, end, radius);
            let span = reach;
            if (friendAt !== null) span = Math.max(0.2, Math.min(reach, friendAt.minus(origin).length()));
            else if (hit !== null && (hit.hitEntity() || hit.blocked())) span = Math.max(0.2, hit.position().minus(origin).length());

            sound(action, "cobblemon:move.watergun.actor");
            WorldFeedback.emit(world, jetpunchScene, 1, origin,
                { moment: "thrust", spray: spray, scale: scale, intensity: intensity, reach: span,
                    direction: [direction.x(), direction.y(), direction.z()], hammer: hammer ? 1 : 0 }, 20);

            // 明确选中一个友方：只走无伤支援，同时浇熄原生火焰和灼伤身份，不造成伤害。
            if (friend && friendAt !== null) {
                if (friendAt.minus(origin).length() > reach + 0.6 || !world.clear(origin, friendAt)) {
                    WorldFeedback.emit(world, jetpunchScene, 1, friendAt, { moment: "whiff", target: String(selected!.ref()), spray: spray, scale: scale }, 18);
                    done(action);
                    return;
                }
                const aflame = jetpunchAflame(world, selected!);
                const cured = aflame && CombatStatus.cure(world, selected!, "burn");
                const out = aflame && world.ignite(selected!, 0);
                if (aflame && (cured || out)) {
                    WorldFeedback.emit(world, jetpunchScene, 1, friendAt, { moment: "douse", target: String(selected!.ref()), aid: 1, scale: scale }, 26);
                    WorldFeedback.text(world, friendAt.plus(WorldCombat.point(0, 1.25, 0)), jetpunchDouseText, [], 24);
                    world.sound("minecraft:block.fire.extinguish", friendAt, 14, "{}");
                } else {
                    // 干着的同伴：只溅一片水花，不挂状态、不造成伤害。
                    WorldFeedback.emit(world, jetpunchScene, 1, friendAt, { moment: "whiff", target: String(selected!.ref()), spray: spray, scale: scale }, 18);
                }
                done(action);
                return;
            }

            const victim = hit !== null ? hit.target() : null;
            if (hit !== null && victim !== null && hit.hitEntity() && world.valid(victim) && !world.friendly(victim)) {
                const landed = impact(action, hit, jetpunchId, power,
                    { damage: damageSpec(jetpunchId, "torrent"), contact: true, punch: true });
                const at = hit.position();
                WorldFeedback.emit(world, jetpunchScene, 1, at,
                    { moment: "hit", target: String(victim.ref()), spray: spray, scale: scale, intensity: intensity }, 24);
                world.sound("cobblemon:impact.water", at, 14, "{}");
                if (landed && world.valid(victim)) {
                    CombatStatus.apply(world, victim, "soaked", jetpunchDrenchedEffect, drench, 0, { unique: true });
                    const away = at.minus(origin);
                    if (away.length() > 0.05) world.hitDisplace(victim, away.unit().scale(drive));
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), jetpunchHitText, [Math.round(power)], 22);
                    if (jetpunchAflame(world, victim)) {
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
            // 一路无人在射程线上：拳线在真实墙体/首碰处截断，落空不画到满拳程末端。
            const stop = hit !== null && hit.blocked() ? hit.position() : end;
            WorldFeedback.emit(world, jetpunchScene, 1, stop, { moment: "whiff", spray: spray, scale: scale }, 18);
            WorldFeedback.text(world, stop.plus(WorldCombat.point(0, 1.0, 0)), jetpunchMissText, [], 20);
            world.sound("minecraft:entity.generic.splash", stop, 12, "{}");
            done(action);
        }
    });
}
