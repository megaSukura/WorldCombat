/**
 * 气场之翼 / esperwing 的出手方式。
 *
 * 核心念头：气场上翼，一对粉色气翼从两侧向前扫出，把正面切开；同一股气场在振翅的一瞬把施法者托快，
 *   翼上余韵还在，人已经比周围先动了一拍。它是本族唯一「攻击同时强化自己」的一击。
 *
 * 三幕：
 *   起（windup，提交前）：气场上翅，背后聚起一圈粉色光环；只播预告，可被打断（打断不花 PP）。
 *   扫（wing，提交后）：左右两翼各铺成一个半扇面向前扫出（两个半扇面的并集就是一个正面；
 *       WorldGeometry.polygon 用同一组顶点判定），每个被扫到的非友方各吃一记 `blade` 气场斩。
 *   托（aura）：同一瞬 NativeEffects.boost(spe, gift) 写入公共能力阶梯，并挂上共享身份
 *       `world_combat:status/esperwing` 的气翼余韵窗口（MobEffect），窗口内留着拖尾。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器在命中点补一发亮粉强调与浮字。
 *
 * 与同族分开：暗袭要害会绕后、旋风刀是蓄力远程、空手劈是零起手单点——气场之翼是唯一在切人的同时
 *   给自己垫速度的一击。玩家从「双翼粉色扇面 + 自身提速光环」认出它。
 *
 * 配置 `flap` 由 resolve 改时序与射程，由公式改威力／翼弧／余韵，提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 一翼的顶点：origin 为翼根，向 fromDeg..toDeg 之间铺 reach 长；判定与表现共用。 */
    function esperwingArc(origin: CombatPoint, direction: CombatPoint, reach: number, fromDeg: number, toDeg: number, segments: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const vertices: CombatPoint[] = [origin];
        for (let i = 0; i <= segments; i++) {
            const angle = (fromDeg + (toDeg - fromDeg) * (i / segments)) * Math.PI / 180;
            const ray = heading.scale(Math.cos(angle)).plus(side.scale(Math.sin(angle)));
            vertices.push(origin.plus(ray.scale(reach)));
        }
        return vertices;
    }

    function esperwingPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: esperwingId,
        cooldownParameter: "recharge",
        name: "Esper Wing",
        description: "气场上翼，一对气翼扫过前方扇面，对其中每个敌人各造成一记特殊伤害，且更容易击中要害；同一瞬提高自己的速度，并在身上留下气翼余韵。",
        uses: ["气场上翼，一对气翼从两侧向前扫出", "切开正面并给多个目标各一记", "振翅的同时给自己垫一档速度"],
        kind: "enemy",
        range: 3.2,
        maxRange: 4.8,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 40,
        style: "psychic",
        stationary: true,
        defaults: { flap: false, ai: { maxChase: 6, boostFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(esperwingId, "reach", pokemon), geometry: "area", style: "psychic", color: 0xE8A8F0,
                label: config && config.flap === true ? "振翅气场之翼" : "滑翔气场之翼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[esperwingId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(esperwingId, "tempo", context)),
                recover: Math.round(p(esperwingId, "aftercast", context)),
                cooldown: Math.round(p(esperwingId, "recharge", context)),
                active: 0,
                range: p(esperwingId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(12, Math.round(p(esperwingId, "motes", action)));
            action.present("world_combat:move_esperwing:gather", esperwingScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", flap: config && config.flap === true, motes: motes, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const direction = aim(action);
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const reach = Math.max(1.4, p(esperwingId, "reach", action));
            const half = p(esperwingId, "arc", action);
            const power = p(esperwingId, "blade", action);
            const gift = Math.max(1, Math.min(2, Math.round(p(esperwingId, "gift", action))));
            const aura = Math.max(40, Math.round(p(esperwingId, "auraTicks", action)));
            const motes = Math.max(12, Math.round(p(esperwingId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.0, reach / esperwingReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 80));

            // 同一股气场先把施法者托快，并留下可见的气翼余韵。
            NativeEffects.boost(world, actor, "spe", gift);
            MobEffects.apply(world, actor, esperwingAura, aura, 0);

            const left = esperwingArc(origin, direction, reach, -half, 0, 6);
            const right = esperwingArc(origin, direction, reach, 0, half, 6);
            WorldFeedback.emit(world, esperwingScene, 1, origin,
                { moment: "wing", path: esperwingPath(left), side: -1, direction: [direction.x(), direction.y(), direction.z()],
                    motes: motes, scale: scale, intensity: intensity }, 24);
            WorldFeedback.emit(world, esperwingScene, 1, origin,
                { moment: "wing", path: esperwingPath(right), side: 1, direction: [direction.x(), direction.y(), direction.z()],
                    motes: motes, scale: scale, intensity: intensity }, 24);

            const full = esperwingArc(origin, direction, reach, -half, half, 12);
            WorldGeometry.selectEnemies(world, WorldGeometry.polygon(full, { below: 1.5, above: 3.0 }), function (enemy, facts) {
                if (!hurt(action, enemy, esperwingId, power, { damage: damageSpec(esperwingId, "blade"), slice: true })) return;
                WorldFeedback.emit(world, esperwingScene, 1, facts.position(),
                    { moment: "cut", target: String(enemy.ref()), motes: motes, scale: scale, intensity: intensity }, 20);
                sound(action, "cobblemon:impact.psychic");
            });

            const feet = origin.plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, esperwingScene, 1, feet,
                { moment: "aura", actor: String(actor.ref()), gift: gift, aura: aura, motes: motes, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, gift / 2 + 0.5)) }, 26);
            WorldFeedback.keep(world, "esperwing:aura:" + String(actor.ref()), esperwingScene, 1, body.position(),
                { moment: "linger", actor: String(actor.ref()), motes: motes, scale: scale }, Math.min(aura, 200));
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, body.height() / 2 + 0.6, 0)), esperwingBoostText, [gift], 28);
            sound(action, "minecraft:entity.phantom.flap");
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记亮粉强调与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_esperwing/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== esperwingId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, esperwingScene, 1, at,
            { moment: "crit", target: String(target.ref()), motes: Math.max(12, Math.min(52, Math.round(ratio * 4))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), esperwingCritText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
