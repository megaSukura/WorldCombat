/**
 * 打雷 / thunder 的出手方式。
 *
 * 念头的形状：先抬头蓄云（windup，提交前在自身与锁定落点各播一段预告）→ 一柱天雷从正上方砸在落点（strike），
 * 落点小范围内所有敌人被电，实际受伤的目标按特攻与湿身决定是否感电（impact）→ 余电散尽。
 *
 * 落点预判：`kind: "point"` 选中地点或一块空地，不要求有敌人。起手就把落点锁进 action data，兑现时用
 * **同一个点**做结算，不追着敌人脚下更新；因此走出标记就能躲开。屋顶是真实的掩体：选定落点头顶被遮住时整记
 * 雷被挡下；落点开阔时，圈内每个敌人各自再查一次头顶——雷只劈在它自己上方没有遮挡的目标上，被屋檐盖住的
 * 目标只看到雷闪在真实遮挡面上。命中率是本招的性格：雨/大暴雨 100%、晴天 50%、其余 70%，由 `WorldEnvironment`
 * 现场读取；每个目标是否感电按它自己的湿身与施法者数据现场求值。
 * 两幕：windup（charge + mark 预告）→ strike（可带多个 impact）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const thunderScene = "world_combat:move_thunder";
    const thunderHitText = "world_combat.move.thunder.text.hit";
    const thunderMissText = "world_combat.move.thunder.text.miss";
    const thunderRoofText = "world_combat.move.thunder.text.roof";
    const thunderPointKey = "world_combat:move_thunder/point";

    /** 现场天气把原生 70 命中翻成：雨 100、晴天 50、其余 70。 */
    function thunderSkyAccuracy(world: CombatWorld, point: CombatPoint): number {
        const env = WorldEnvironment.read(world, point);
        if (env && typeof env.rain === "number" && env.rain > 0.2) return 100;
        if (env && env.day === true && env.skyVisible === true) return 50;
        return 70;
    }

    /** 落点上方第一处真实遮挡（原生碰撞面），就是这记天雷实际撞上的东西；畅通则 null。 */
    function thunderRoof(world: CombatWorld, point: CombatPoint): CombatPoint | null {
        const hit = WorldGeometry.blockHit(world, WorldCombat.point(point.x(), point.y() + 24, point.z()), point);
        return hit === null ? null : hit.position();
    }

    function thunderStoredPoint(action: CombatAction): CombatPoint | null {
        const raw = action.data(thunderPointKey);
        if (raw === null) return null;
        const value = JSON.parse(raw);
        if (!value || typeof value.x !== "number" || typeof value.y !== "number" || typeof value.z !== "number") return null;
        return WorldCombat.point(value.x, value.y, value.z);
    }

    define({
        id: "thunder",
        name: "Thunder",
        description: "先蓄雷云，再从天空朝选定落点劈下一柱暴雷：范围小但极重，雨里必定命中、晴天更容易打偏，屋顶能挡下整记雷。可以点选空地预判落点，走出去就能躲开；落点开阔时，圈内每个目标各自再看一次头顶，被屋檐盖住的只有它自己被挡下。",
        uses: ["从远处劈下一个目标", "在雨里召唤必定命中的天雷", "用屋檐关掉这记天雷"],
        kind: "point",
        range: 13,
        maxRange: 18,
        prepare: 0,
        active: 30,
        recover: 12,
        cooldown: 48,
        style: "sky",
        defaults: { charged: false, ai: { maxChase: 16, preferWet: true, preferStill: true } },
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
            // 起手锁定落点：兑现时读回同一点，标记与天雷不会各指一处。
            const locked = action.targetPosition();
            action.data(thunderPointKey, JSON.stringify({ x: locked.x(), y: locked.y(), z: locked.z() }));
            const radius = Math.max(0.5, p("thunder", "strikeRadius", action));
            action.present("world_combat:move_thunder:charge", thunderScene, 1, action.origin(), JSON.stringify({ moment: "charge", charged: !!(config && config.charged) }));
            action.present("world_combat:move_thunder:mark", thunderScene, 1, WorldGeometry.ground(action.sense(), locked, 6),
                JSON.stringify({ moment: "mark", radius: radius, scale: radius / 2.0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const point = thunderStoredPoint(action) || action.targetPosition();
            const radius = p("thunder", "strikeRadius", action);
            const power = p("thunder", "bolt", action);
            const intensity = Math.max(0.6, Math.min(2.4, power / 100));
            const env = WorldEnvironment.read(world, point);

            // 落雷阶段开始：地平圈预告完成使命，先停发射再兑现，避免预警圈在雷后仍亮着。
            action.present("world_combat:move_thunder:mark", thunderScene, 1, WorldGeometry.ground(world, point, 6),
                JSON.stringify({ moment: "mark", radius: radius, scale: radius / 2.0,
                    lifecycle: { reason: "settled", tick: action.sense().tick() } }));

            if (env && env.loaded === true && env.skyVisible === false) {
                // 选定落点被屋顶/岩石遮住：只在真实遮挡面上闪，落点不结算。
                const roof = thunderRoof(world, point) || WorldCombat.point(point.x(), point.y() + 2.5, point.z());
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
                // 每个目标各自再查一次头顶：被屋檐/岩层盖住的那一个只看到雷闪在真实遮挡面，不吃伤害。
                const cover = thunderRoof(world, facts.position());
                if (cover !== null) {
                    WorldFeedback.emit(world, thunderScene, 1, cover, { moment: "roof", scale: 1 }, 18);
                    return;
                }
                // 感电概率按该目标自己的湿身现场求值，而不是遍历前统一取一次。
                const chance = p("thunder", "thunderChance", withTarget(factContext(action), target));
                const landed = hurt(action, target, "thunder", power,
                    { damage: damageSpec("thunder", "bolt"), status: "paralysis", chance: chance });
                // 实际受伤才给命中/感电反馈；落点只打中地面时不冒假反馈。
                if (!landed) return;
                hits++;
                const numb = CombatStatus.has(world, target, "paralysis");
                WorldFeedback.emit(world, thunderScene, 1, facts.position(),
                    { moment: "impact", target: String(target.ref()), intensity: intensity, sparks: numb ? 24 : 0 }, 30);
            });
            WorldFeedback.emit(world, thunderScene, 1, point, { moment: "strike", radius: radius, scale: radius / 2.0, bursts: 20 + hits * 10, intensity: intensity, hits: hits }, 34);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.4, 0)), hits > 0 ? thunderHitText : thunderMissText, hits > 0 ? [hits] : [], 30);
            sound(action, "minecraft:entity.lightning_bolt.impact");
            done(action);
        }
    });
}
