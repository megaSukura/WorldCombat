/**
 * 精神剑 / psyblade —— 注册与动作。
 *
 * 核心念头：凝出一把几乎看不见的灵刃，顺着瞄准方向直刺出去；自己脚下若带着电场的电荷，灵刃被镀亮，
 *   威力 ×1.5，并沿同一条线再延长一段，能把排成一列的人都刺到。它读的是**施法者自己站的地**，
 *   与「电力上升」读目标脚下正好相反；离场后下一次恢复短刃，场地本身不被消耗。
 *
 * 三幕：
 *   起（draw，提交前）：手中凝出折光与一圈灵能微光；脚下带电时刃身爬着电弧，只播预告。
 *   刺（execute → cut/miss）：提交后先压上一步（速度决定能迈多远），随后朝选定方向刺出一条很窄的直线
 *       （WorldGeometry.lane，判定与表现共用同一段线），刃线内的每个非友方各挨一次 `blade`（每个各算各的），
 *       被顶开；实墙会截短刃线，墙后不被刺到。带电时线更长，离场就恢复短刃。没人被刺到只留一道空挥。
 *   加成：`blade` 的公式读施法者脚下是否有共享身份 world_combat:status/electricterrain。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: psybladeId,
        cooldownParameter: "recharge",
        name: "精神剑",
        description: "凝出一把几乎看不见的灵刃，朝选定方向直刺出一条很窄的直线；自己站在电气场地上时，灵刃被电荷镀亮、威力提高，并沿同一条线再延长一段，能刺到排成一列的人。实墙会截短刃线，离场后下一次恢复短刃。",
        uses: ["贴着电气场地的电荷刺出一记重锋", "站在电荷上时一刃穿透排成一列的敌人", "用看不见的刃切断对手架势"],
        kind: "aim",
        range: 4.0,
        maxRange: 7.5,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "psy",
        defaults: { extend: false, ai: { maxChase: 9, seekTerrain: true, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(psybladeId, "reach", pokemon) : 4, geometry: "line", style: "psy", color: 0xB79BFF,
                label: config && config.extend === true ? "穿排精神剑" : "聚锋精神剑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psybladeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psybladeId, "tempo", context)),
                recover: Math.round(p(psybladeId, "settle", context)),
                cooldown: Math.round(p(psybladeId, "recharge", context)),
                active: 0,
                range: p(psybladeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const charged = psybladeChargedNow(action.sense(), action.actor());
            action.present("psyblade:draw", psybladeScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", extend: config && config.extend === true ? 1 : 0, charged: charged ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const reach = p(psybladeId, "reach", action);
            const surge = p(psybladeId, "surge", action);
            const half = Math.max(0.2, p(psybladeId, "bladeHalf", action));
            const speed = p(psybladeId, "dashSpeed", action);
            const push = p(psybladeId, "push", action);
            const shards = Math.max(10, Math.round(p(psybladeId, "shards", action)));
            const extend = !!(config && config.extend);
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const foe = target !== null && world.valid(target) && !world.friendly(target) ? world.observe(target) : null;

            // 目标还在贴身距离外就先压上一步；一步到位（不逐刻移动），速度只决定能否贴上。
            if (foe !== null) {
                const toTarget = foe.position().minus(origin);
                const distance = toTarget.length();
                if (distance > reach * 0.7) {
                    const step = Math.min(distance - reach * 0.5, Math.max(0, speed * 8));
                    if (step > 0.05) world.displace(actor, toTarget.unit().scale(step));
                }
            }
            const arrived = world.observe(actor);
            const cutOrigin = arrived === null ? origin : arrived.position();
            // 走过一步之后再读脚下的电量：踏入电场这一刺同样算数；离场则恢复短刃。
            const power = p(psybladeId, "blade", action);
            const charged = psybladeChargedNow(world, actor);
            const length = Math.max(reach, reach + (charged ? surge : 0));
            const mouth = cutOrigin.plus(WorldCombat.point(0, 0.9, 0));

            // 实墙截刃：沿同一条线找到第一块原生方块碰面，刃线在那里停住，墙后不被刺到。
            const far = cutOrigin.plus(direction.scale(length));
            const clip = world.clipBlocks(mouth, far);
            let bladeEnd = far;
            if (clip !== null && clip.blocked()) {
                const stop = clip.blockPosition();
                if (stop !== null) bladeEnd = WorldCombat.point(stop.x(), stop.y(), stop.z());
            }
            const actual = Math.max(0.4, bladeEnd.minus(cutOrigin).length());
            const scale = Math.max(0.6, Math.min(2.2, actual / psybladeReference));
            const intensity = Math.max(0.6, Math.min(2.6, power / (charged ? 60 : 90)));
            const region = WorldGeometry.lane(cutOrigin, direction, actual, half, { below: 1.6, above: 2.8 });
            let hits = 0;

            sound(action, "cobblemon:move.psychic.actor");
            WorldFeedback.emit(world, psybladeScene, 1, cutOrigin,
                { moment: "slash", direction: [direction.x(), direction.y(), direction.z()], reach: reach, surge: charged ? surge : 0,
                    length: actual, half: half, shards: shards, scale: scale, intensity: intensity,
                    charged: charged ? 1 : 0, extend: extend ? 1 : 0,
                    path: [[mouth.x(), mouth.y(), mouth.z()], [bladeEnd.x(), bladeEnd.y(), bladeEnd.z()]] }, 22);

            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                // 墙后无伤：与目标之间必须有通视线。
                if (!world.clear(cutOrigin, facts.position())) return;
                if (!hurt(action, victim, psybladeId, power,
                    { damage: damageSpec(psybladeId, "blade"), contact: true, slice: true })) return;
                hits++;
                if (push > 0.02) {
                    const away = facts.position().minus(cutOrigin);
                    if (world.valid(victim) && away.length() > 0.2) world.hitDisplace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                }
                WorldFeedback.emit(world, psybladeScene, 1, facts.position(),
                    { moment: "cut", target: String(victim.ref()), shards: shards, scale: scale, charged: charged ? 1 : 0,
                        intensity: intensity }, 22);
                world.sound("cobblemon:impact.psychic", facts.position(), 14, "{}");
            });

            if (hits === 0) {
                WorldFeedback.emit(world, psybladeScene, 1, bladeEnd, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, bladeEnd.plus(WorldCombat.point(0, 0.9, 0)), psybladeMissText, [], 20);
            } else {
                WorldFeedback.text(world, cutOrigin.plus(WorldCombat.point(0, 1.15, 0)),
                    charged ? psybladeChargedText : psybladeCutText, charged ? [] : [hits], 24);
            }
            world.sound("minecraft:entity.player.attack.sweep", cutOrigin, 14, "{}");
            done(action);
        }
    });
}
