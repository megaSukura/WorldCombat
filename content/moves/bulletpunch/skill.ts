/**
 * 子弹拳 / bulletpunch 的出手方式。
 *
 * 核心念头：当场击发、笔直贯穿的一记钢拳——起手为 0（提交即打），施法者不位移，钢铁拳锋沿瞄准方向一发打穿；
 *   这条窄线上排在前面的敌人被一并贯穿，拳锋够硬，按更低的防御系数结算。
 *
 * 两幕：
 *   起（windup，提交前）：拳头握紧、金属光泽在拳面收拢，只播预告（present chamber）；默认 0 刻，穿甲弹才看得见。
 *   打（execute）：提交后沿瞄准方向做一次瞬时窄线判定——线内的非友方按距离排序，前 `pierce` 个各结算一次
 *       round（接触 + punch，钢弹穿甲）伤害，并把第一个顶开；线内无人就只是击空（whiff）。
 *
 * 与同族分开：音速拳是格斗气爆、只打第一个；子弹拳的读法是钢弹贯穿——一条金属火花线把前后排着的人一起打穿。
 */
namespace PokemonSkills {
    function bulletpunchCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: bulletpunchId,
        cooldownParameter: "recharge",
        name: "Bullet Punch",
        description: "The user strikes with tough punches as fast as bullets. This move always goes first.",
        uses: ["贴身的瞬发钢拳先手", "把排成一条线的前后排一起打穿", "不位移地补一下并把人推开"],
        kind: "enemy",
        range: 2.3,
        maxRange: 3.4,
        prepare: 0,
        active: 0,
        recover: 5,
        cooldown: 14,
        style: "punch",
        defaults: { ap: false, ai: { maxChase: 6, lines: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(bulletpunchId, "reach", pokemon) : 2.3) * 1.3, geometry: "line", style: "punch", color: 0xC8D4E0,
                label: config && config.ap === true ? "子弹拳·穿甲" : "子弹拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[bulletpunchId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(bulletpunchId, "tempo", context)),
                recover: Math.round(p(bulletpunchId, "settle", context)),
                cooldown: Math.round(p(bulletpunchId, "recharge", context)),
                active: 0,
                range: p(bulletpunchId, "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("bulletpunch:chamber", bulletpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "chamber", windup: prepare, sparks: Math.round(p(bulletpunchId, "sparks", action)),
                    ap: config && config.ap === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const at = action.targetPosition();
            const flat = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
            const heading = flat.length() < 0.3 ? aim(action) : flat.unit();
            const reach = Math.max(1.2, p(bulletpunchId, "reach", action));
            const halfWidth = Math.max(0.2, p(bulletpunchId, "halfWidth", action));
            const power = p(bulletpunchId, "round", action);
            const push = p(bulletpunchId, "push", action);
            const pierce = Math.max(1, Math.round(p(bulletpunchId, "pierce", action)));
            const sparks = Math.max(10, Math.round(p(bulletpunchId, "sparks", action)));
            const ap = !!(config && config.ap);
            const scale = Math.max(0.6, Math.min(1.8, halfWidth / 0.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const end = origin.plus(heading.scale(reach));
            const direction = [heading.x(), heading.y(), heading.z()];
            const candidates: { actor: CombatActor; at: CombatPoint; range: number }[] = [];

            sound(action, "minecraft:entity.arrow.shoot");
            WorldFeedback.emit(world, bulletpunchScene, 1, origin,
                { moment: "fire", direction: direction, path: [bulletpunchCoords(origin), bulletpunchCoords(end)],
                    halfWidth: halfWidth, sparks: sparks, scale: scale, intensity: intensity, ap: ap ? 1 : 0 }, 22);

            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, heading, reach, halfWidth, { below: 1.5, above: 2.6 }),
                function (enemy: CombatActor, facts: CombatObservation): void {
                    candidates.push({ actor: enemy, at: facts.position(), range: facts.position().minus(origin).length() });
                });
            candidates.sort(function (a, b) { return a.range - b.range; });

            let hits = 0;
            for (let index = 0; index < candidates.length && hits < pierce; index++) {
                const victim = candidates[index].actor;
                const landed = hurt(action, victim, bulletpunchId, power,
                    { damage: damageSpec(bulletpunchId, "round"), contact: true, punch: true });
                if (!landed) continue;
                hits++;
                const away = candidates[index].at.minus(origin);
                if (world.valid(victim) && away.length() > 0.05) world.displace(victim, away.unit().scale(push));
                world.sound("cobblemon:move.bulletpunch.target", candidates[index].at, 14, "{}");
                world.sound("cobblemon:impact.steel", candidates[index].at, 14, "{}");
                WorldFeedback.emit(world, bulletpunchScene, 1, candidates[index].at,
                    { moment: hits === 1 ? "hit" : "pierce", target: String(victim.ref()), index: hits, sparks: sparks,
                        scale: scale, intensity: intensity, ap: ap ? 1 : 0 }, 24);
                WorldFeedback.text(world, candidates[index].at.plus(WorldCombat.point(0, 1.1, 0)),
                    hits === 1 ? bulletpunchHitText : bulletpunchPierceText, [Math.round(power)], 22);
            }

            if (hits === 0) {
                WorldFeedback.emit(world, bulletpunchScene, 1, end,
                    { moment: "whiff", direction: direction, sparks: sparks, scale: scale, intensity: intensity }, 20);
                WorldFeedback.text(world, end.plus(WorldCombat.point(0, 1.05, 0)), bulletpunchMissText, [], 20);
                world.sound("minecraft:item.trident.hit_ground", end, 12, "{}");
            }
            done(action);
        }
    });
}
