/**
 * 音速拳 / machpunch 的出手方式。
 *
 * 核心念头：脚不动，拳头过隙——一记快到声音都追不上的直拳，拳锋先到、音爆后到。它只在已经贴近到一臂之内
 *   时才成立，是全族唯一不位移的一招：不改变你的位置，只把这一拳送出去。
 *
 * 两幕：
 *   起（windup，提交前）：拳锋在身前收拢、压缩空气在拳上成形，只播预告（present chamber）；默认起手 0 刻，
 *       这一拍极短，重拳式才看得清。
 *   打（execute）：提交后从身体中心朝目标方向做一次瞬时直线判定——撞上非友方活体就结算 jab（带 punch 标记）、
 *       把它顶开一点，并在接触点炸开音爆环（boom）；一路无人在射程线上就只是挥空（whiff）。
 *
 * 与同族分开：快手还击只在对手出手时闪身刺、有闪身位移；音速拳任何时候都能出、不闪身。
 *   击掌奇袭只在刚出场、拍懵并打断；音速拳没有懵、没有打断，只是最快的贴身一拳。
 */
namespace PokemonSkills {
    define({
        id: machpunchId,
        cooldownParameter: "recharge",
        name: "Mach Punch",
        description: "脚不动，拳头过隙——一记快到声音都追不上的直拳。起手可以短到瞬发、施法者不位移，只在已经贴近到一臂之内时打得中；拳锋先到，音爆后到。重拳式先蓄一拍换更重的一拳。",
        uses: ["贴身时最快的先手一拳", "不位移地收掉残血目标", "接在别的招之后立刻补一下"],
        kind: "enemy",
        range: 2.2,
        maxRange: 3.8,
        prepare: 0,
        active: 0,
        recover: 5,
        cooldown: 14,
        style: "punch",
        defaults: { heavy: false, ai: { maxChase: 5 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(machpunchId, "reach", pokemon) : 2.2) * 1.3, geometry: "line", style: "punch", color: 0xF2A65A,
                label: config && config.heavy === true ? "音速拳·重拳" : "音速拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[machpunchId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(machpunchId, "tempo", context)),
                recover: Math.round(p(machpunchId, "settle", context)),
                cooldown: Math.round(p(machpunchId, "recharge", context)),
                active: 0,
                range: p(machpunchId, "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("machpunch:chamber", machpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "chamber", windup: prepare, heavy: config && config.heavy === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const reach = p(machpunchId, "reach", action);
            const radius = p(machpunchId, "collisionRadius", action);
            const power = p(machpunchId, "jab", action);
            const push = p(machpunchId, "push", action);
            const boom = p(machpunchId, "boom", action);
            const ring = Math.max(6, Math.round(p(machpunchId, "ring", action)));
            const count = Math.round(14 + power * 0.4);
            const scale = radius / 0.36;
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const origin = action.origin();
            const end = origin.plus(direction.scale(reach));

            sound(action, "minecraft:entity.player.attack.weak");

            function finish(current: CombatAction, at: CombatPoint, moment: string, textKey: string, args: any[]): void {
                const scope = current.world();
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), textKey, args, 22);
                scope.sound(moment === "whiff" ? "minecraft:entity.player.attack.sweep" : "cobblemon:impact.fighting", at, 14, "{}");
                done(current);
            }

            const hit = action.trace(origin, end, radius);
            const victim = hit.target();
            if (hit.hitEntity() && victim !== null && world.valid(victim) && !world.friendly(victim)) {
                WorldFeedback.emit(world, machpunchScene, 1, hit.position(),
                    { moment: "boom", target: String(victim.ref()), count: count, ring: ring, boom: boom, scale: scale, intensity: intensity }, 26);
                world.sound("minecraft:entity.warden.sonic_boom", hit.position(), 14, "{}");
                const landed = impact(action, hit, machpunchId, power, { damage: damageSpec(machpunchId, "jab"), contact: true, punch: true });
                if (landed && world.valid(victim)) {
                    const away = hit.position().minus(origin);
                    if (away.length() > 0.05) world.displace(victim, away.unit().scale(push));
                }
                finish(action, hit.position(), "boom", machpunchBoomText, [Math.round(power)]);
                return;
            }
            WorldFeedback.emit(world, machpunchScene, 1, end,
                { moment: "whiff", ring: ring, boom: boom, scale: scale, intensity: intensity }, 20);
            finish(action, end, "whiff", machpunchWhiffText, []);
        }
    });
}
