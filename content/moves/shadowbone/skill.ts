/**
 * 暗影之骨 / shadowbone 的出手方式。
 *
 * 核心念头：从身侧唤出一根缠着灵魂的骨棒，脱手掷出；灵魂只在瞄定目标时牵引骨棒追上，空掷则照直飞。命中时炸开
 * 阴气、发出一声惨叫，被砸中的人被那股阴气慑住、防御松动。它不接触，能在远处兑现。
 *
 * 三幕：
 *   起（windup，提交前）：身侧浮起骨影与阴气，骨头在手里成形。
 *   击（throw → impact）：提交后把骨棒掷出，骨棒带一圈灵魂尾迹飞行；显式瞄定目标时灵魂牵引（命中 100 落成“会自己找上”），
 *       方向空掷则照直飞、按自身寿命散掉。命中活物时结算一次不接触伤害，并按慑防几率降防、挂上慑防标记。
 *   收：骨棒没砸中活物就落在地上，留成一根真骨头（pickupDelay 后有拾取延迟），谁都能捡；每次施放最多一份，
 *       命中活物不会再多掉一根。命中处只有一声闷响后散去。
 *
 * 选取为 aim：方向、点或任意阵营实体都能放，可以预判空投；不要提交时存在敌人。
 * 与同族分开：碎岩是贴脸连点、铁尾是慢而重的下砸、撕裂爪是踏前交叉撕抓；暗影之骨是远程骨投，单发更贵。
 * 共享身份 world_combat:status/guardbroken 由 startup.ts 声明。
 */
namespace PokemonSkills {
    const shadowboneScene = "world_combat:move_shadowbone";
    const shadowboneMark = "world_combat:shadowbone_spooked";
    const shadowboneRattleText = "world_combat.move.shadowbone.text.rattle";

    define({
        id: "shadowbone",
        name: "Shadow Bone",
        description: "从身侧唤出一根缠着灵魂的骨棒，掷向远处的对手：显式瞄定目标时骨棒会自己追上去，空掷则照直飞出；命中时造成不接触伤害，有机会把目标慑得防御下降一级。落空的骨头会留在地上，谁都能捡。",
        uses: ["在远处掷出带灵魂的骨棒", "先手压低一个远敌的防御", "把落空的骨头留在战场上给谁都能捡"],
        kind: "aim",
        range: 5.0,
        maxRange: 9.0,
        prepare: 8,
        active: 30,
        recover: 10,
        cooldown: 40,
        style: "hurl",
        defaults: { ai: { maxChase: 9, spookFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("shadowbone", "collisionRadius", pokemon), geometry: "line", style: "ghost", color: 0x8A7AB8, label: "暗影之骨" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["shadowbone"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("shadowbone", "prepare", context),
                recover: p("shadowbone", "recover", context),
                cooldown: p("shadowbone", "cooldown", context),
                range: Math.max(5.0, p("shadowbone", "throwRange", context))
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shadowbone:windup", shadowboneScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("shadowbone", "bone", action);
            const speed = p("shadowbone", "throwSpeed", action);
            const range = p("shadowbone", "throwRange", action);
            const radius = p("shadowbone", "collisionRadius", action);
            const chance = p("shadowbone", "rattleChance", action);
            const stages = Math.max(1, Math.round(p("shadowbone", "rattleStages", action)));
            const markTicks = Math.max(40, Math.round(p("shadowbone", "rattleTicks", action)));
            const gravity = p("shadowbone", "gravity", action);
            const notes = Math.max(10, Math.round(power * 1.1));
            const scale = radius / 0.3;
            const target = action.target();
            const origin = action.origin();
            let settled = false, dropped = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.shadowball.actor");

            // 真实骨棒会翻着飞；只有显式瞄定目标才让灵魂牵引，手动空掷就照直飞。
            const appearance: any = { item: "minecraft:bone", glow: true, spin: true, scale: 1.1 };
            if (target !== null && world.valid(target))
                appearance.homing = { target: String(target.ref()), turn: 14, range: range };
            const flight: LivingActions.Flight = {
                speed: speed, range: range, radius: radius, gravity: gravity,
                lifetime: Math.max(30, Math.round(range / Math.max(0.2, speed) + 20)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact, age: number) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "shadowbone", power, { damage: damageSpec("shadowbone", "bone"), contact: false });
                        if (landed && scope.valid(victim) && scope.random() < chance) {
                            // 实际被慑住（未被免疫）才留慑纹与标记。
                            if (NativeEffects.boost(scope, victim, "def", -stages) !== 0
                                && MobEffects.apply(scope, victim, shadowboneMark, markTicks, 0) !== null) {
                                const body = scope.observe(victim);
                                if (body !== null) {
                                    WorldFeedback.emit(scope, shadowboneScene, 1, body.position(),
                                        { moment: "wail", target: String(victim.ref()), stages: stages, scale: 1 }, 26);
                                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), shadowboneRattleText, [stages], 30);
                                    scope.sound("minecraft:entity.vex.ambient", body.position(), 12, "{}");
                                }
                            }
                        }
                    } else if (hit.blocked() && !hit.hitEntity() && !dropped) {
                        // 骨棒没砸中活物：落在地上留成一根真骨头；每次施放最多一份。
                        dropped = true;
                        scope.dropItem(point, "minecraft:bone", 1, JSON.stringify({ pickupDelay: 40 }));
                        scope.sound("minecraft:block.bone_block.break", point, 10, "{}");
                    }
                    WorldFeedback.emit(scope, shadowboneScene, 1, point,
                        { moment: "impact", target: victim ? String(victim.ref()) : "", notes: notes, scale: scale }, 26);
                    scope.sound("cobblemon:impact.ghost", point, 14, "{}");
                }
            };
            const projectile = LivingActions.projectile(action, flight, function (current: CombatAction) { finish(current); });
            WorldFeedback.keep(world, "shadowbone:trail:" + action.id(), shadowboneScene, 1, origin,
                { moment: "throw", projectile: projectile, scale: scale, notes: notes }, flight.lifetime! + 10);
        }
    });
}
