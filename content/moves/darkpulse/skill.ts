/**
 * 恶之波动 / darkpulse 的出手方式。
 *
 * 核心念头：从胸口逼出一团充满恶意的暗色气场，朝选定的一片地推过去；抵达或半路撞上人时炸开成一片
 * 恶意领域，罩住的人各挨一记，可能被恐惧攥住而愣住。气团飞到哪、在哪里炸开，玩家看得见；罩住谁也只
 * 认那一次实际接触。
 *
 * 三幕：
 *   起（windup，提交前）：低头把恶意压在胸口、四周暗点向内收拢的预告。
 *   行（release → travel）：提交后气场从胸口脱手，沿直线推向落点，一路拖出碎缕。
 *   爆（burst）：抵达或撞人时炸开一片领域，半径内的敌人各挨一记并各掷一次畏缩；爆心与半径都以实际碰撞点为准，
 *       气团散去后不再留下看似持续伤害的余韵。
 *
 * 与同族的区分：暗影球是只打单体、命中后磨防的幽灵球；恶之波动是到点炸开、罩住一片的暗色气场。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const darkpulseScene = "world_combat:move_darkpulse";
    const darkpulseFlinchEffect = "world_combat:darkpulse_flinch";
    const darkpulseFlinchText = "world_combat.move.darkpulse.text.flinch";
    const darkpulseHitText = "world_combat.move.darkpulse.text.hit";
    const darkpulseMissText = "world_combat.move.darkpulse.text.miss";

    function darkpulseFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, darkpulseFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "darkpulse",
        cooldownParameter: "recharge",
        name: "Dark Pulse",
        description: "从胸口逼出一团恶意气场，朝选定的一片地推过去；到点炸开，罩住的敌人各挨一记并可能畏缩。弥漫式罩得更开但更轻，凝聚式更快更重。",
        uses: ["罩住挤在一片的一群敌人", "隔一段距离先手压血", "用恶意领域把近身的人震懵"],
        kind: "point",
        range: 11,
        maxRange: 18,
        prepare: 12,
        active: 0,
        recover: 8,
        cooldown: 32,
        style: "dark",
        defaults: { creep: false, ai: { maxChase: 14, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("darkpulse", "bloom", pokemon), geometry: "area", style: "dark", color: 0x4A2C6B,
                label: config && config.creep === true ? "恶之波动·弥漫" : "恶之波动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["darkpulse"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("darkpulse", "tempo", context)),
                recover: Math.round(p("darkpulse", "settle", context)),
                cooldown: Math.round(p("darkpulse", "recharge", context)),
                active: 0,
                range: p("darkpulse", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("darkpulse:windup", darkpulseScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", creep: config && config.creep === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(darkpulseScene);
            const world = action.world();
            const origin = action.origin();
            const centre = action.targetPosition();
            const power = p("darkpulse", "aura", action);
            const bloom = p("darkpulse", "bloom", action);
            const speed = p("darkpulse", "velocity", action);
            const radius = p("darkpulse", "radius", action);
            const chance = p("darkpulse", "flinchChance", action);
            const flinchTicks = Math.round(p("darkpulse", "flinchTicks", action));
            const motes = Math.max(8, Math.round(p("darkpulse", "motes", action)));
            const scale = bloom / 3.0;
            const intensity = Math.max(0.5, Math.min(2, power / 70));
            const count = Math.max(12, Math.round(12 + power * 0.3));
            const chest = origin.plus(WorldCombat.point(0, 0.35, 0));
            const distance = Math.max(0.6, centre.minus(origin).length());
            let detonated = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 气场停在（或撞上）实际接触点时：把该点那一圈里的敌人各结算一次，气团随即散去。 */
            function detonate(current: CombatAction, point: CombatPoint): void {
                if (detonated) return;
                detonated = true;
                scenes.stop(current, "travel");
                const scope = current.world();
                let hits = 0;
                WorldFeedback.emit(scope, darkpulseScene, 1, point,
                    { moment: "burst", scale: scale, intensity: intensity, motes: motes, count: count }, 30);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, bloom, { below: 1, above: 4 }), function (enemy, facts) {
                    const landed = hurt(current, enemy, "darkpulse", power, { damage: damageSpec("darkpulse", "aura") });
                    WorldFeedback.emit(scope, darkpulseScene, 1, facts.position(),
                        { moment: "veil", target: String(enemy.ref()), scale: scale, intensity: intensity, motes: motes }, 24);
                    if (!landed) return;
                    hits++;
                    if (scope.random() < chance && darkpulseFlinch(scope, enemy, flinchTicks)) {
                        WorldFeedback.emit(scope, darkpulseScene, 1, facts.position(), { moment: "flinch", target: String(enemy.ref()) }, 24);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.1, 0)), darkpulseFlinchText, [], 26);
                    }
                });
                sound(current, "cobblemon:impact.dark");
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)),
                    hits > 0 ? darkpulseHitText : darkpulseMissText, hits > 0 ? [hits] : [], 26);
                finish(current);
            }

            sound(action, "minecraft:entity.evoker.cast_spell");
            WorldFeedback.emit(world, darkpulseScene, 1, chest,
                { moment: "release", scale: scale, intensity: intensity, motes: motes,
                    direction: [ (centre.x() - chest.x()), (centre.y() - chest.y()), (centre.z() - chest.z()) ] }, 22);

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/largesmokeorb", tint: 0x3A2A55, glow: true,
                scale: Math.max(0.8, Math.min(1.8, radius / 0.28))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: distance + 0.6, radius: radius,
                lifetime: Math.max(30, Math.round(distance / Math.max(0.2, speed) + 30)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) { detonate(current, hit.position()); }
            }, function (current: CombatAction) { detonate(current, current.targetPosition()); });

            scenes.show(action, "travel", chest,
                { moment: "travel", projectile: flight, scale: scale, intensity: intensity, motes: motes });
        }
    });

}
