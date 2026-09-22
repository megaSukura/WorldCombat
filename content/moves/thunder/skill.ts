/**
 * 打雷 / thunder 的出手方式。
 *
 * 念头的形状：先抬头蓄云（windup，提交前在自身与目标落点各播一段预告）→ 一柱天雷从正上方砸在落点（strike），
 * 落点小范围内所有敌人被电，按特攻与湿身决定是否感电（impact）→ 余电散尽。
 * 命中率是本招的性格：雨/大暴雨 100%、晴天 50%、其余 70%，由 `WorldEnvironment` 现场读取；
 * 目标头顶没有天空（屋顶、洞窟）时天雷根本落不下来，只劈在遮蔽物上——屋檐是真实的掩体。
 * 两幕：windup（charge + mark 预告）→ strike（可带多个 impact）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const thunderScene = "world_combat:move_thunder";
    const thunderHitText = "world_combat.move.thunder.text.hit";
    const thunderMissText = "world_combat.move.thunder.text.miss";
    const thunderRoofText = "world_combat.move.thunder.text.roof";

    /** 现场天气把原生 70 命中翻成：雨 100、晴天 50、其余 70。 */
    function thunderSkyAccuracy(world: CombatWorld, point: CombatPoint): number {
        const env = WorldEnvironment.read(world, point);
        if (env && typeof env.rain === "number" && env.rain > 0.2) return 100;
        if (env && env.day === true && env.skyVisible === true) return 50;
        return 70;
    }

    define({
        id: "thunder",
        name: "Thunder",
        description: "A wicked thunderbolt is dropped on the target to inflict damage. This may also leave the target with paralysis.",
        uses: ["从远处劈下一个目标", "在雨里召唤必定命中的天雷", "用屋檐关掉这记天雷"],
        kind: "enemy",
        range: 13,
        maxRange: 18,
        prepare: 0,
        active: 30,
        recover: 12,
        cooldown: 48,
        style: "sky",
        defaults: { charged: false, ai: { maxChase: 16, preferWet: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["thunder"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var charged = !!(config && config.charged);
            return {
                prepare: p("thunder", "chargeTicks", context),
                recover: p("thunder", "recover", context) + (charged ? 2 : 0),
                cooldown: p("thunder", "cooldown", context) + (charged ? 8 : 0),
                range: p("thunder", "boltRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_thunder:charge", thunderScene, 1, action.origin(), JSON.stringify({ moment: "charge", charged: !!(config && config.charged) }));
            action.present("world_combat:move_thunder:mark", thunderScene, 1, action.targetPosition(), JSON.stringify({ moment: "mark" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const point = action.targetPosition();
            const radius = p("thunder", "strikeRadius", action);
            const power = p("thunder", "bolt", action);
            const chance = p("thunder", "thunderChance", action);
            const intensity = Math.max(0.6, Math.min(2.4, power / 100));
            const env = WorldEnvironment.read(world, point);

            if (env && env.loaded === true && env.skyVisible === false) {
                const roof = WorldCombat.point(point.x(), point.y() + 2.5, point.z());
                WorldFeedback.emit(world, thunderScene, 1, roof, { moment: "roof", scale: 1 }, 22);
                WorldFeedback.text(world, roof.plus(WorldCombat.point(0, 0.6, 0)), thunderRoofText, [], 26);
                sound(action, "minecraft:entity.lightning_bolt.impact");
                done(action);
                return;
            }
            const accuracy = thunderSkyAccuracy(world, point);
            if (world.random() * 100 >= accuracy) {
                const offset = Math.max(1.6, radius * 1.7);
                const angle = world.random() * Math.PI * 2;
                const missAt = WorldCombat.point(point.x() + Math.cos(angle) * offset, point.y(), point.z() + Math.sin(angle) * offset);
                world.lightning(missAt, true);
                WorldFeedback.emit(world, thunderScene, 1, missAt, { moment: "miss", scale: 1 }, 24);
                WorldFeedback.text(world, missAt.plus(WorldCombat.point(0, 1, 0)), thunderMissText, [], 24);
                sound(action, "minecraft:entity.lightning_bolt.thunder");
                done(action);
                return;
            }

            world.lightning(point, true);
            sound(action, "cobblemon:move.thunder.actor");
            let hits = 0;
            const region = WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (target, facts) {
                hurt(action, target, "thunder", power, { damage: damageSpec("thunder", "bolt"), status: "paralysis", chance: chance });
                hits++;
                WorldFeedback.emit(world, thunderScene, 1, facts.position(), { moment: "impact", target: String(target.ref()), intensity: intensity }, 30);
            });
            WorldFeedback.emit(world, thunderScene, 1, point, { moment: "strike", scale: radius / 2.0, bursts: 20 + hits * 10, intensity: intensity, hits: hits }, 34);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.4, 0)), hits > 0 ? thunderHitText : thunderMissText, hits > 0 ? [hits] : [], 30);
            sound(action, "minecraft:entity.lightning_bolt.impact");
            done(action);
        }
    });
}
