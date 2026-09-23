/**
 * 精神剑 / psyblade —— 注册与动作。
 *
 * 核心念头：凝出一把几乎看不见的灵刃，一步压到对手身上横向劈开；自己脚下若带着电场的电荷，灵刃被镀亮，
 *   威力 ×1.5，斩痕里窜出电弧。它读的是**施法者自己站的地**，与「电力上升」读目标脚下正好相反。
 *
 * 三幕：
 *   起（draw，提交前）：手中凝出折光与一圈灵能微光；脚下带电时刃身爬着电弧，只播预告。
 *   斩（execute → cut/echo/miss）：提交后先压上一步（速度决定能迈多远），随后扇区
 *       （WorldGeometry.sector，判定与表现共用同一张角）内的主目标吃满 `blade` 并被顶开，
 *       最多 `echoCap` 个旁人各吃 `echo` 比例的刃风；没人被斩到只留一道空挥。
 *   加成：`blade` 的公式读施法者脚下是否有共享身份 world_combat:status/electricterrain。
 */
namespace PokemonSkills {
    /** 挥斩弧线：origin 为心、朝 direction 张开 span 度、半径 reach 的一段横向弧；判定与表现共用。 */
    function psybladeArc(origin: CombatPoint, direction: CombatPoint, reach: number, span: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const y = origin.y() + 0.55;
        const vertices: number[][] = [];
        for (let index = 0; index <= 4; index++) {
            const angle = (index / 4 - 0.5) * span * Math.PI / 180;
            const point = origin.plus(heading.scale(Math.cos(angle) * reach)).plus(side.scale(Math.sin(angle) * reach));
            vertices.push([point.x(), y, point.z()]);
        }
        return vertices;
    }

    define({
        freeMovement: true,
        id: psybladeId,
        cooldownParameter: "recharge",
        name: "精神剑",
        description: "凝出一把几乎看不见的灵刃贴身劈开对手；自己站在电气场地上时，灵刃被电荷镀亮、威力提高，斩痕里窜出电弧。",
        uses: ["贴着电气场地的电荷打出一记重斩", "切开主目标并顶开近旁的旁人", "用看不见的刃切断对手架势"],
        kind: "enemy",
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
            return { radius: pokemon ? p(psybladeId, "reach", pokemon) : 4, geometry: "cone", style: "psy", color: 0xB79BFF,
                label: config && config.extend === true ? "延展精神剑" : "聚锋精神剑" };
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
            const direction = aim(action);
            const reach = p(psybladeId, "reach", action);
            const speed = p(psybladeId, "dashSpeed", action);
            const span = p(psybladeId, "span", action);
            const echo = p(psybladeId, "echo", action);
            const cap = Math.max(0, Math.round(p(psybladeId, "echoCap", action)));
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
            // 走过一步之后再读脚下的电量：踏入电场这一刀同样算数。
            const power = p(psybladeId, "blade", action);
            const charged = psybladeChargedNow(world, actor);
            const scale = Math.max(0.6, Math.min(2.0, (reach + 0.4) / psybladeReference));
            const intensity = Math.max(0.6, Math.min(2.6, (charged ? power / 60 : power / 90)));
            const heading = [direction.x(), direction.y(), direction.z()];
            const region = WorldGeometry.sector(cutOrigin, direction, reach + 0.4, span, { below: 1.6, above: 2.8 });
            let hits = 0, grazed = 0;

            sound(action, "cobblemon:move.psychic.actor");
            WorldFeedback.emit(world, psybladeScene, 1, cutOrigin,
                { moment: "slash", direction: heading, reach: reach, span: span, shards: shards, scale: scale,
                    intensity: intensity, charged: charged ? 1 : 0, extend: extend ? 1 : 0,
                    path: psybladeArc(cutOrigin, direction, reach + 0.4, span) }, 22);

            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                const primary = foe !== null && target !== null && String(victim.ref()) === String(target.ref());
                if (!primary && grazed >= cap) return;
                const amount = primary ? power : power * echo;
                if (!hurt(action, victim, psybladeId, amount,
                    { damage: damageSpec(psybladeId, "blade"), contact: true, slice: true })) return;
                if (primary) {
                    hits++;
                    if (push > 0.02) {
                        const away = facts.position().minus(cutOrigin);
                        if (world.valid(victim) && away.length() > 0.2) world.displace(victim, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                    }
                    WorldFeedback.emit(world, psybladeScene, 1, facts.position(),
                        { moment: "cut", target: String(victim.ref()), shards: shards, scale: scale, charged: charged ? 1 : 0,
                            intensity: intensity }, 22);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.15, 0)),
                        charged ? psybladeChargedText : psybladeCutText, charged ? [] : [Math.round(amount)], 24);
                    world.sound("cobblemon:impact.psychic", facts.position(), 14, "{}");
                } else {
                    grazed++;
                    WorldFeedback.emit(world, psybladeScene, 1, facts.position(),
                        { moment: "echo", target: String(victim.ref()), shards: Math.max(6, Math.round(shards * 0.6)),
                            scale: scale, charged: charged ? 1 : 0, intensity: intensity * 0.8 }, 18);
                }
            });

            if (hits === 0) {
                const at = cutOrigin.plus(WorldCombat.point(direction.x(), 0, direction.z()).unit().scale(reach));
                WorldFeedback.emit(world, psybladeScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), psybladeMissText, [], 20);
            } else if (grazed > 0) {
                WorldFeedback.text(world, cutOrigin.plus(WorldCombat.point(0, 1.15, 0)), psybladeEchoText, [grazed], 24);
            }
            world.sound("minecraft:entity.player.attack.sweep", cutOrigin, 14, "{}");
            done(action);
        }
    });
}
