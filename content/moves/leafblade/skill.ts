/**
 * 叶刃 / leafblade —— 注册与动作。
 *
 * 核心念头：把一片叶当作剑握在手里，一步压上、横挥一次——贴身的重斩把主目标整个切开，刃风还扫到近旁的
 *   旁人；刀刃切得够深，主目标的防御被削掉一档。它是四记里唯一接触、单体、最重的一击。
 *
 * 幕：
 *   起（windup，提交前）：叶片在身侧立起、拉长成一把刃，边缘亮起；只播预告，可被打断。
 *   斩（execute → cut/echo/miss）：提交后若目标在贴身距离外，先压上一步；随后扇区
 *       （WorldGeometry.sector，判定与表现共用同一张角）内的主目标吃满 `edge` 接触斩击并被削防
 *       `sever` 档，最多 `echoCap` 个旁人各吃 `echo` 比例的刃风。没人被斩到只留一道空挥。
 *
 * 高暴击沿用原生 critRatio 2 的共享结算；暴击命中时由本单元监听器在命中点补一记更亮的白绿强调。
 */
namespace PokemonSkills {
    /** 挥斩弧线：origin 为心、朝 direction 张开 span 度、半径 reach 的一段横向弧；判定与表现共用。 */
    function leafbladeArc(origin: CombatPoint, direction: CombatPoint, reach: number, span: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const half = Math.tan(Math.min(88, span) / 2 * Math.PI / 180) * reach, y = origin.y() + 0.55;
        const vertices: number[][] = [];
        for (let index = 0; index <= 4; index++) {
            const angle = (index / 4 - 0.5) * span * Math.PI / 180;
            const point = origin.plus(heading.scale(Math.cos(angle) * reach)).plus(side.scale(Math.sin(angle) * reach));
            vertices.push([point.x(), y, point.z()]);
        }
        return vertices;
    }

    define({
        id: leafbladeId,
        cooldownParameter: "recharge",
        name: "Leaf Blade",
        description: "The user handles a sharp leaf like a sword and cuts the target to inflict damage. This move has a heightened chance of landing a critical hit.",
        uses: ["把一片叶当作剑，贴身横挥一记重斩", "切开主目标并削掉它一档防御", "刃风顺带扫到近旁的旁人"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.6,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "leaf",
        defaults: { twohand: false, ai: { maxChase: 4, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(leafbladeId, "reach", pokemon), geometry: "cone", style: "leaf", color: 0x9BE86A,
                label: config && config.twohand === true ? "双手叶刃" : "叶刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[leafbladeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(leafbladeId, "tempo", context)),
                recover: Math.round(p(leafbladeId, "aftercast", context)),
                cooldown: Math.round(p(leafbladeId, "recharge", context)),
                active: 0,
                range: p(leafbladeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("leafblade:draw", leafbladeScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", twohand: config && config.twohand === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const direction = aim(action);
            const power = p(leafbladeId, "edge", action);
            const reach = p(leafbladeId, "reach", action);
            const span = p(leafbladeId, "span", action);
            const echo = p(leafbladeId, "echo", action);
            const sever = Math.max(1, Math.round(p(leafbladeId, "sever", action)));
            const cap = Math.max(0, Math.round(p(leafbladeId, "echoCap", action)));
            const shards = Math.max(10, Math.round(p(leafbladeId, "shards", action)));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const foe = target !== null && world.valid(target) && !world.friendly(target) ? world.observe(target) : null;

            // 目标还在贴身距离外就先压上一步（AI 通常已走近，这里保证玩家施放与目标移动后仍能贴上）。
            if (foe !== null) {
                const toTarget = foe.position().minus(origin);
                const distance = toTarget.length();
                if (distance > reach * 0.7) {
                    const step = Math.min(distance - reach * 0.5, reach);
                    if (step > 0.05) world.displace(actor, toTarget.unit().scale(step));
                }
            }
            const arrived = world.observe(actor);
            const cutOrigin = arrived === null ? origin : arrived.position();
            const scale = Math.max(0.6, Math.min(2.0, (reach + 0.4) / leafbladeReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const heading = [direction.x(), direction.y(), direction.z()];
            const region = WorldGeometry.sector(cutOrigin, direction, reach + 0.4, span, { below: 1.6, above: 2.8 });
            let hits = 0, grazed = 0;

            sound(action, "cobblemon:move.razorleaf.actor_1");
            WorldFeedback.emit(world, leafbladeScene, 1, cutOrigin,
                { moment: "slash", direction: heading, reach: reach + 0.4, span: span, shards: shards, scale: scale,
                    intensity: intensity, path: leafbladeArc(cutOrigin, direction, reach + 0.4, span),
                    twohand: config && config.twohand === true ? 1 : 0 }, 22);

            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                const primary = foe !== null && target !== null && String(victim.ref()) === String(target.ref());
                if (!primary && grazed >= cap) return;
                const amount = primary ? power : power * echo;
                if (!hurt(action, victim, leafbladeId, amount,
                    { damage: damageSpec(leafbladeId, "edge"), contact: true, slice: true })) return;
                if (primary) {
                    hits++;
                    NativeEffects.boost(world, victim, "def", -sever);
                    WorldFeedback.emit(world, leafbladeScene, 1, facts.position(),
                        { moment: "cut", target: String(victim.ref()), shards: shards, sever: sever, scale: scale,
                            intensity: intensity }, 22);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.15, 0)), leafbladeSeverText, [sever], 24);
                } else {
                    grazed++;
                    WorldFeedback.emit(world, leafbladeScene, 1, facts.position(),
                        { moment: "echo", target: String(victim.ref()), shards: Math.max(6, Math.round(shards * 0.6)),
                            scale: scale, intensity: intensity * 0.8 }, 18);
                }
            });

            if (hits === 0) {
                const at = cutOrigin.plus(WorldCombat.point(direction.x(), 0, direction.z()).unit().scale(reach));
                WorldFeedback.emit(world, leafbladeScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), leafbladeMissText, [], 20);
            } else {
                WorldFeedback.text(world, cutOrigin.plus(WorldCombat.point(0, 1.15, 0)), leafbladeCutText,
                    grazed > 0 ? [grazed] : [], 24);
            }
            sound(action, "minecraft:item.trident.hit");
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的白绿刃光与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_leafblade/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== leafbladeId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 14;
        WorldFeedback.emit(world, leafbladeScene, 1, at,
            { moment: "crit", target: String(target.ref()), shards: Math.max(10, Math.min(44, Math.round(ratio * 4))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), leafbladeCritText, [], 28);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
