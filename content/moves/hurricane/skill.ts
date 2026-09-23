/**
 * 暴风 / hurricane 的出手方式。
 *
 * 核心念头：一道横掠战场的大风旋。它从施法者处生成、沿瞄准方向一路卷过去，涡心经过的地方把范围内的敌人
 * 卷起、抛出，并可能把目标卷得晕头转向（出手会打偏、用力会伤到自己）。它不是弹丸，也不是原地不动的区域，
 * 而是一堵会走的、有宽度的风墙——涡心走过的路线就是它会扫到的地方，玩家可以走开。
 *
 * 天气是材料（对应原生命中 70／雨 100／晴 50）：**下雨**风旋更稳、更宽、更快、更容易卷晕；**晴天**
 * （白天且见天）风旋左右飘移、半径收小、混乱概率下降，能不能卷到人由走位与风的行踪共同决定。
 *
 * 三幕：
 *   起（windup，提交前）：身边卷起上升气流的预告。
 *   行（gather → sweep ×steps）：提交后在施法者处成立风旋，逐刻沿瞄准方向推进；每个目标第一次被罩住时
 *       结算 gale 特殊伤害，沿风的行进方向被抛出 toss 格、抬起 lift 格，并按概率挂上本单元的混乱载体
 *       （共享身份 world_combat:status/confusion）。
 *   散（dissipate）：风走完距离，在终点散开。
 *
 * 配置 tight（收束式）由 resolve 改时序、由公式改风威/涡径/混乱，提交后才触碰世界。
 */
namespace PokemonSkills {
    const hurricaneEffect = "world_combat:hurricane_vertigo";
    const hurricaneScene = "world_combat:move_hurricane";
    const hurricaneHitText = "world_combat.move.hurricane.text.hit";
    const hurricaneConfuseText = "world_combat.move.hurricane.text.confuse";
    const hurricaneRecoilText = "world_combat.move.hurricane.text.recoil";
    /** 混乱载体振幅（失手概率）。 */
    const hurricaneFumble = 0.32;
    /** 反噬基数（最大生命比例）；被风卷晕的目标打中别人时按攻击放大。 */
    const hurricaneRecoilFraction = 0.05;

    /** 只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function hurricaneCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === hurricaneEffect ? effect : null;
    }

    define({
        id: "hurricane",
        cooldownParameter: "recharge",
        name: "Hurricane",
        description: "召起一道会走的大风旋，从施法者出发沿瞄准方向席卷而过，把途径上的敌人卷起抛出，并可能让对方晕头转向。雨天更宽更狠，晴天会左右飘移。",
        uses: ["从远处放出一道横扫的风墙，卷过一条线上的敌人", "把扎堆的目标一起卷起抛出、打散阵形", "雨天里起风，让风旋更稳、更容易卷晕对手"],
        kind: "enemy",
        range: 11,
        maxRange: 18,
        prepare: 12,
        active: 60,
        recover: 12,
        cooldown: 52,
        style: "wind",
        defaults: { tight: false, ai: { maxChase: 16, preferLines: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hurricane", "vortexRadius", pokemon), geometry: "line", style: "wind", color: 0x9FD8E8, label: "暴风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["hurricane"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("hurricane", "tempo", context)),
                recover: Math.round(p("hurricane", "aftercast", context)),
                cooldown: Math.round(p("hurricane", "recharge", context)),
                range: p("hurricane", "travel", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_hurricane:windup", hurricaneScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", tight: !!(config && config.tight) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const landing = action.targetPosition();
            const radius0 = p("hurricane", "vortexRadius", action);
            const power = p("hurricane", "gale", action);
            const advanceBase = p("hurricane", "advance", action);
            const travel = p("hurricane", "travel", action);
            const toss = p("hurricane", "toss", action);
            const lift = p("hurricane", "lift", action);
            const confuseChance = p("hurricane", "confuseChance", action);
            const confuseTicks = Math.max(20, Math.round(p("hurricane", "confuseTicks", action)));
            const drift = p("hurricane", "drift", action);
            const swathes = Math.max(4, Math.round(p("hurricane", "swathes", action)));
            const env = WorldEnvironment.read(world, origin);
            const rain = !!env && typeof env.rain === "number" && env.rain > 0.2;
            const sun = !!env && env.day === true && env.skyVisible === true && !rain;
            const radius = radius0 * (rain ? 1.15 : sun ? 0.82 : 1);
            const speed = advanceBase * (rain ? 1.2 : sun ? 0.85 : 1);
            const scale = radius / 2.6;
            const intensity = Math.max(0.5, Math.min(2.4, power / 95));
            const forward = landing.minus(origin);
            const flat = WorldCombat.point(forward.x(), 0, forward.z());
            const heading = flat.length() < 0.6 ? aim(action) : flat.unit();
            const distance = Math.max(travel, flat.length() + radius);
            const steps = Math.max(1, Math.round(distance / Math.max(0.05, speed)));
            const phase = world.random() * Math.PI * 2;
            const flow = Math.round(swathes * 14 * Math.max(0.6, scale));
            const scatter = swathes * 4;
            const struck: { [ref: string]: boolean } = {};
            let step = 0;
            sound(action, "minecraft:entity.breeze.whirl");
            WorldFeedback.emit(world, hurricaneScene, 1, origin,
                { moment: "gather", scale: scale, intensity: intensity, spin: swathes, radius: radius, flow: flow, rain: rain ? 1 : 0, sun: sun ? 1 : 0 }, 24);

            function finish(current: CombatAction): void {
                const body = current.world().observe(current.actor());
                const at = body === null ? origin.plus(heading.scale(distance)) : body.position();
                WorldFeedback.emit(current.world(), hurricaneScene, 1, at,
                    { moment: "dissipate", scale: scale, intensity: intensity, radius: radius, spin: swathes, flow: flow, scatter: scatter }, 30);
                sound(current, "minecraft:entity.breeze.wind_burst");
                done(current);
            }

            function sweep(current: CombatAction): void {
                if (step >= steps) { finish(current); return; }
                step++;
                const scope = current.world();
                let centre = origin.plus(heading.scale(speed * step));
                if (sun) {
                    const wobble = Math.sin(phase + step * 0.7) * drift;
                    centre = centre.plus(WorldCombat.point(-heading.z() * wobble, 0, heading.x() * wobble));
                }
                const region = WorldGeometry.ring(centre, 0, radius, { below: 2.5, above: 4 });
                WorldGeometry.selectEnemies(scope, region, function (victim, facts) {
                    const ref = String(victim.ref());
                    if (struck[ref]) return;
                    struck[ref] = true;
                    if (!hurt(current, victim, "hurricane", power,
                        { damage: damageSpec("hurricane", "gale"), flags: { wind: true } })) return;
                    const away = facts.position().minus(centre);
                    const push = away.length() < 0.05 ? heading : away.unit();
                    if (scope.valid(victim)) scope.displace(victim, push.scale(toss).plus(WorldCombat.point(0, lift, 0)));
                    let confused = false;
                    if (scope.random() < confuseChance) {
                        CombatStatus.apply(scope, victim, "confusion", hurricaneEffect, confuseTicks, Math.round(hurricaneFumble * 100), { unique: true });
                        confused = true;
                    }
                    WorldFeedback.emit(scope, hurricaneScene, 1, facts.position(),
                        { moment: "impact", target: ref, intensity: intensity, spin: swathes, confuse: confused ? 1 : 0, toss: toss, lift: lift }, 30);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.4, 0)),
                        confused ? hurricaneConfuseText : hurricaneHitText, [], 30);
                });
                WorldFeedback.keep(scope, "hurricane:vortex:" + String(current.actor().ref()), hurricaneScene, 1, centre,
                    { moment: "sweep", radius: radius, scale: scale, intensity: intensity, spin: swathes, flow: flow, step: step, steps: steps }, 6);
                current.after(1, sweep);
            }

            action.after(1, function (first: CombatAction) { sweep(first); });
        }
    });


    // 反噬：被风卷晕的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_hurricane/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (hurricaneCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.spa || facts.stats.atk || 0;
        const fraction = hurricaneRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, hurricaneScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), hurricaneRecoilText, [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 混乱存续期：低密度的飞鸟每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_hurricane/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hurricaneEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "hurricane:linger:" + String(actor.ref()), hurricaneScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
