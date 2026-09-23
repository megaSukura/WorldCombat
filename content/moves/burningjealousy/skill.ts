/** burningjealousy：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    define({
        id: burningjealousyId,
        cooldownParameter: "recharge", name: "妒火",
        description: "朝前喷出扇形火焰。目标的能力强化和药水、信标增益越多，这一击越重，并会留下灼伤。",
        uses: ["惩罚刚强化过的对手", "一次扫过身前挤成一排的敌人", "用灼伤压制正在铺垫的强化手"],
        kind: "enemy", range: 5, maxRange: 8, prepare: 7, active: 1, recover: 8, cooldown: 32,
        style: "fire", stationary: true, maximumTicks: 120,
        defaults: { fixate: false, ai: { maxChase: 10, minStages: 1, leaveStation: false } },
        fields: [field(pathOf("fixate"), "妒噬式", "boolean", {
            help: "开启（妒噬式）：张角收窄到七成、射程缩到八成，但威力 ×1.2、灼伤时长 ×1.3、冷却更长，适合盯住一个刚强化的目标猛烧；关闭（燎原式）：铺得更远更宽，一次罩住一排敌人，但威力 ×0.85、灼伤更短。"
        })],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(burningjealousyId, "reach", pokemon) : 4.5, geometry: "cone", style: "fire", color: 0x6FD08A,
                label: config && config.fixate === true ? "妒火 · 妒噬" : "妒火 · 燎原" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[burningjealousyId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(burningjealousyId, "tempo", context)),
                recover: Math.round(p(burningjealousyId, "settle", context)),
                cooldown: Math.round(p(burningjealousyId, "recharge", context)),
                active: 1,
                range: p(burningjealousyId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const angle = p(burningjealousyId, "angle", action);
            const reach = p(burningjealousyId, "reach", action);
            action.present("burningjealousy-charge", burningjealousyScene, 1, body ? body.position() : action.origin(),
                JSON.stringify({ moment: "charge", angle: angle, reach: reach, fixate: config && config.fixate === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position(), targetPos = action.targetPosition();
            const delta = targetPos.minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = p(burningjealousyId, "reach", action);
            const angle = p(burningjealousyId, "angle", action);
            const power = p(burningjealousyId, "flare", action);
            const step = p(burningjealousyId, "envyStep", action);
            const cap = p(burningjealousyId, "envyCap", action);
            const burnBase = Math.max(40, Math.round(p(burningjealousyId, "burnBase", action)));
            const burnPer = Math.max(0, Math.round(p(burningjealousyId, "burnPerStage", action)));
            const maxTargets = Math.round(p(burningjealousyId, "maxTargets", action));
            const motes = Math.round(p(burningjealousyId, "motes", action));
            const scale = reach / burningjealousyReferenceReach;
            const vertices = burningJealousyPath(burningJealousyFan(origin, direction, reach, angle));
            let hits = 0, ignited = 0, totalStages = 0, best = 0;

            sound(action, "cobblemon:move.fireblast.actor");
            const region = WorldGeometry.sector(origin, direction, reach, angle, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                if (hits >= maxTargets) return;
                const boost = burningJealousyBoost(world, victim);
                const factor = 1 + Math.min(cap, boost * step);
                const dealt = hurt(action, victim, burningjealousyId, power * factor, { damage: damageSpec(burningjealousyId, "flare") });
                if (!dealt) return;
                hits++;
                totalStages += boost;
                if (boost > best) best = boost;
                let burned = false;
                if (boost > 0) burned = CombatStatus.inflict(world, victim, "burn", burnBase + boost * burnPer);
                if (burned) ignited++;
                WorldFeedback.emit(world, burningjealousyScene, 1, facts.position(),
                    { moment: "hit", target: String(victim.ref()), stages: boost, burned: burned ? 1 : 0,
                        gnaw: boost * 4, intensity: 1 + Math.min(1.2, boost * 0.12) }, 30);
            });
            WorldFeedback.emit(world, burningjealousyScene, 1, origin,
                { moment: "wave", path: vertices, reach: reach, angle: angle, scale: scale, hits: hits,
                    ignited: ignited, stages: totalStages, best: best, motes: motes,
                    rise: 0.8 + Math.min(4, best * 0.35),
                    intensity: 1 + Math.min(1.6, totalStages * 0.12 + hits * 0.2) }, 44);
            if (best > 0) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.45, 0)), burningjealousyEnvyText, [best], 36);
            else WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.35, 0)), burningjealousyHitText, [hits], 30);
            world.sound(best > 0 ? "minecraft:entity.blaze.shoot" : "cobblemon:impact.fire", origin, 16, "{}");
            done(action);
        }
    });
}
