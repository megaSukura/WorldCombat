/**
 * 水炮 / hydropump 的出手方式。
 *
 * 核心念头：**把「大量水流」整柱轰出去**——不是加农水炮那种又细又准的高压柱，而是水多到会漫开：
 *   主目标被整柱砸中、沿水柱方向被顶开，水花在落点炸开、回溅到附近一圈，把那一圈的人也浇透。
 *   代价是慢、贵（PP 5）、起手长——那一段蓄水就是给对手的走位窗口，命中 80 由此变成看得见的事。
 *
 * 三幕：
 *   起（charge，提交前）：大量水在身前后翻涌成一大团、身体后仰，只播预告（可以被打断，所以能扑空）。
 *   轰（torrent → burst / dud，提交后）：粗水柱沿准线（带 `spread` 随机偏角）轰出去，拖着宽水尾；
 *       命中非友方结算 `torrent`，把目标沿水柱方向顶开 `blow`、浇透 `soakTicks`；打到硬面只有一声水响。
 *   漫（douse / flood）：落点一圈 `backwash` 内的非友方各吃一次 `splash`、被推、被浇透，
 *       落点留下一圈水花持续一段时间（表现，不破坏方块——水会退，玩家的家不被淹）。
 *
 * 与场上最像的招分开：加农水炮是笔直单点高压柱、放完施法者力竭；水炮是体积——宽判定、大回溅、
 *   一次浇透一圈，但单点更轻、没有力竭。喷水是从脚下整圈漫出，水炮是朝准线轰。
 *
 * 配置 `deluge`（漫灌）由公式改威力／回溅／湿身／散射／时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hydropumpScene = "world_combat:move_hydropump";
    const hydropumpSoaked = "world_combat:hydropump_soaked";
    const hydropumpSoakText = "world_combat.move.hydropump.text.soak";
    const hydropumpMissText = "world_combat.move.hydropump.text.miss";

    /** 把湿透挂到目标身上：共享身份 soaked，本单元效果，独一无二地替换同类载体。 */
    function hydropumpDrench(world: CombatWorld, victim: CombatActor, ticks: number): boolean {
        return CombatStatus.apply(world, victim, "soaked", hydropumpSoaked, Math.max(40, Math.round(ticks)), 0,
            { unique: true, secondary: true });
    }

    define({
        id: "hydropump",
        cooldownParameter: "recharge",
        name: "Hydro Pump",
        description: "把大量水整柱轰向目标：命中处水花漫开，主目标被顶开并浇透，附近一圈也被回溅到。起手很长、很贵、准线附近会散，但一次能浇透一片。漫灌式更广更慢；冲压式更窄更重。",
        uses: ["远距离把目标顶开并浇透", "一次浇透目标身边挤着的一群人", "把湿身身份交给别的招（如加农水炮）去加成"],
        kind: "enemy",
        range: 12,
        maxRange: 18,
        prepare: 15,
        active: 0,
        recover: 12,
        cooldown: 48,
        style: "tide",
        defaults: { deluge: false, ai: { maxChase: 12, reserve: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hydropump", "backwash", pokemon), geometry: "circle", style: "tide",
                color: 0x2C86C8, label: config && config.deluge === true ? "漫灌水炮" : "冲压水炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["hydropump"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("hydropump", "tempo", context)),
                recover: Math.round(p("hydropump", "aftercast", context)),
                cooldown: Math.round(p("hydropump", "recharge", context)),
                active: 0,
                range: p("hydropump", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("hydropump:charge", hydropumpScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", volume: Math.round(p("hydropump", "volume", action)),
                    deluge: config && config.deluge === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("hydropump", "torrent", action);
            const splash = p("hydropump", "splash", action);
            const radius = Math.max(0.35, p("hydropump", "radius", action));
            const backwash = Math.max(1.2, p("hydropump", "backwash", action));
            const blow = Math.max(0.2, p("hydropump", "blow", action));
            const speed = Math.max(0.5, p("hydropump", "velocity", action));
            const soak = Math.max(60, Math.round(p("hydropump", "soakTicks", action)));
            const spread = Math.max(1.5, p("hydropump", "spread", action));
            const volume = Math.max(30, Math.round(p("hydropump", "volume", action)));
            const deluge = !!(config && config.deluge);
            const scale = Math.max(0.6, Math.min(2.6, backwash / 2.4));
            const intensity = Math.max(0.6, Math.min(2.4, power / 110));
            const base = aim(action);
            const angle = (world.random() * 2 - 1) * spread * Math.PI / 180;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const direction = WorldCombat.point(base.x() * cos - base.z() * sin, base.y(), base.x() * sin + base.z() * cos);
            const flat = WorldCombat.point(direction.x(), 0, direction.z());
            const push = flat.length() > 0.001 ? flat.unit().scale(blow) : WorldCombat.point(0, 0, 0);
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.hydropump.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range() + 1.5, radius: radius, direction: direction, gravity: 0,
                lifetime: Math.max(30, Math.round((action.range() + 1.5) / Math.max(0.2, speed) + 20)),
                appearance: { sprite: "cobblemon:generic/water/waterjet_head", tint: 0x2C86C8, glow: true,
                    scale: Math.max(1.0, Math.min(2.2, radius / 0.55)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        struck = true;
                        if (!impact(current, hit, "hydropump", power, { damage: damageSpec("hydropump", "torrent") })) return;
                        if (scope.valid(victim)) scope.displace(victim, push);
                        hydropumpDrench(scope, victim, soak);
                        WorldFeedback.emit(scope, hydropumpScene, 1, point,
                            { moment: "burst", target: String(victim.ref()), volume: volume, scale: scale,
                                intensity: intensity, blow: blow, deluge: deluge ? 1 : 0 }, 30);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), hydropumpSoakText, [], 26);
                        sound(current, "cobblemon:move.hydropump.target");
                        sound(current, "cobblemon:impact.water");
                    } else {
                        WorldFeedback.emit(scope, hydropumpScene, 1, point,
                            { moment: "dud", volume: volume, scale: scale, intensity: intensity }, 20);
                        scope.sound("minecraft:entity.generic.splash", point, 14, "{}");
                    }
                    // 回溅：落点一圈内的非友方被浇透、被推、各吃一次 splash。
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, backwash, { below: 2.0, above: 2.5 }),
                        function (other, facts) {
                            if (victim !== null && String(other.ref()) === String(victim.ref())) return;
                            const landed = hurt(current, other, "hydropump", splash,
                                { damage: damageSpec("hydropump", "splash") });
                            const off = facts.position().minus(point);
                            if (scope.valid(other) && off.length() > 0.2) {
                                const flatOff = WorldCombat.point(off.x(), 0, off.z());
                                if (flatOff.length() > 0.001) scope.displace(other, flatOff.unit().scale(blow * 0.6));
                            }
                            hydropumpDrench(scope, other, Math.round(soak * 0.7));
                            WorldFeedback.emit(scope, hydropumpScene, 1, facts.position(),
                                { moment: "douse", target: String(other.ref()), landed: landed ? 1 : 0,
                                    scale: Math.max(0.5, scale * 0.8), intensity: Math.max(0.4, intensity * 0.7) }, 22);
                        });
                    WorldFeedback.emit(scope, hydropumpScene, 1, point,
                        { moment: "flood", radius: backwash, volume: volume, scale: scale }, Math.max(30, Math.round(soak * 0.5)));
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    const scope = current.world();
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 0.9, 0)),
                        hydropumpMissText, [], 24);
                }
                finish(current);
            });

            WorldFeedback.keep(world, "hydropump:jet:" + action.id(), hydropumpScene, 1, origin,
                { moment: "torrent", projectile: flight, volume: volume, scale: scale, intensity: intensity,
                    deluge: deluge ? 1 : 0 }, 120);
        }
    });
}
