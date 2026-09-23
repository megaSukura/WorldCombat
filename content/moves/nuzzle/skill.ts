/**
 * 蹭蹭脸颊 / nuzzle —— 出手方式。
 *
 * 核心念头：得先贴到对手身上。施法者蹲下攒电、朝目标扑一截，够得着才把带电的脸颊蹭上去；
 *   蹭上只有极小的物理伤害，但一定把对手麻住。反过来说，没贴到就是彻底的空——它用「接近」代替命中率。
 *
 * 幕：
 *   起（windup，提交前）：蹲身、脸颊噼啪攒电的预告（`action.present`，可被打断、不花 PP）。
 *   扑（lunge）：提交后朝目标扑出最多 `lunge` 格，扑到接触半径内就算够着，画面留一条电尾。
 *   蹭（touch / whiff）：够着时按 `nudge` 结算一次物理伤害，并无条件施加共享麻痹身份；够不着只留一下扑空的电花。
 *
 * 与同族分开：电磁炮、十万伏特、电击都是发出去的电；只有蹭蹭脸颊是**接触**招——必须把身位送进去，
 *   反制方式因此变成「别让它靠近」，而不是走位躲弹。
 */
namespace PokemonSkills {
    const nuzzleScene = "world_combat:move_nuzzle";
    const nuzzleHitText = "world_combat.move.nuzzle.text.hit";
    const nuzzleImmuneText = "world_combat.move.nuzzle.text.immune";
    const nuzzleWhiffText = "world_combat.move.nuzzle.text.whiff";

    define({
        freeMovement: true,
        id: nuzzleId,
        cooldownParameter: "recharge",
        name: "Nuzzle",
        description: "得先贴到对手身上：蹭一下带电的脸颊，伤害极小，但命中就使对方麻痹——期间移动减半，每次出招还有四分之一概率落空。扑空就什么也不发生。猛扑式能扑得更远，代价是落地更慢、蹭的劲更小。电属性对麻痹免疫。",
        uses: ["贴身把对手必麻", "追上逃开的对手再蹭住", "先手控制一个难缠的目标"],
        kind: "enemy",
        range: 2.5,
        maxRange: 3.8,
        prepare: 7,
        active: 4,
        recover: 7,
        cooldown: 15,
        style: "spark",
        defaults: { pounce: false, ai: { maxChase: 9, seekUnparalysed: true, preferFast: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[nuzzleId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(nuzzleId, "tempo", context)),
                recover: Math.round(p(nuzzleId, "settle", context)),
                cooldown: Math.round(p(nuzzleId, "recharge", context)),
                active: 4,
                range: p(nuzzleId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const arcs = Math.max(3, Math.round(p(nuzzleId, "arcs", action)));
            action.present("nuzzle:cheek:" + action.id(), nuzzleScene, 1, action.origin(),
                JSON.stringify({ moment: "cheek", windup: prepare, arcs: arcs, pounce: config && config.pounce ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[nuzzleId], detail: { values: config } };
            return { radius: p(nuzzleId, "reach", context), geometry: "area", style: "spark", color: 0xFFE96A,
                label: config && config.pounce === true ? "蹭蹭脸颊·猛扑" : "蹭蹭脸颊" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const target = action.target();
            const selfStart = world.observe(self);
            const origin0 = selfStart === null ? action.origin() : selfStart.position();
            const lunge = p(nuzzleId, "lunge", action);
            const touch = p(nuzzleId, "touchReach", action);
            const power = p(nuzzleId, "nudge", action);
            const numbTicks = Math.max(20, Math.round(p(nuzzleId, "numbTicks", action)));
            const arcs = Math.max(3, Math.round(p(nuzzleId, "arcs", action)));
            const scale = Math.max(0.6, Math.min(1.8, touch / 0.85));
            const intensity = Math.max(0.6, Math.min(1.8, power / 22));

            sound(action, "cobblemon:move.thundershock.actor");

            // 扑：朝目标贴近到接触距离以内。够不到就停在原地，这一下变成空。
            if (target !== null && world.valid(target)) {
                const at = world.observe(target);
                if (at !== null) {
                    const delta = at.position().minus(origin0);
                    const flat = WorldCombat.point(delta.x(), 0, delta.z());
                    const gap = flat.length();
                    const step = Math.min(lunge, Math.max(0, gap - touch * 0.4));
                    if (step > 0.03) world.displace(self, flat.unit().scale(step));
                }
            }

            const selfBody = world.observe(self);
            const here = selfBody === null ? origin0 : selfBody.position();
            const halfSelf = selfBody === null ? 0.45 : selfBody.width() * 0.5;
            WorldFeedback.emit(world, nuzzleScene, 1, here,
                { moment: "lunge", arcs: arcs, scale: scale, intensity: intensity }, 18);

            let contact = false;
            let point = action.targetPosition();
            if (target !== null && world.valid(target)) {
                const at = world.observe(target);
                if (at !== null) {
                    point = at.position();
                    const gap = point.minus(here).length();
                    if (gap <= touch + halfSelf + at.width() * 0.5 && world.clear(here, point)) contact = true;
                }
            }

            if (contact && target !== null) {
                hurt(action, target, nuzzleId, power, { damage: damageSpec(nuzzleId, "nudge"), contact: true });
                const applied = CombatStatus.inflict(world, target, "paralysis", numbTicks);
                WorldFeedback.emit(world, nuzzleScene, 1, point,
                    { moment: "touch", target: String(target.ref()), sparks: Math.round(12 + power * 0.8),
                        arcs: arcs, scale: scale, intensity: intensity }, 26);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), applied ? nuzzleHitText : nuzzleImmuneText, [], 26);
                world.sound("minecraft:entity.cat.purr", point, 14, "{}");
                if (applied) sound(action, "cobblemon:move.thundershock.target");
            } else {
                WorldFeedback.emit(world, nuzzleScene, 1, here.plus(WorldCombat.point(0, 0.2, 0)),
                    { moment: "whiff", arcs: arcs, scale: scale }, 18);
                WorldFeedback.text(world, here.plus(WorldCombat.point(0, 0.9, 0)), nuzzleWhiffText, [], 20);
            }
            done(action);
        }
    });
}
