/**
 * 爆裂拳 / dynamicpunch 的出手方式。
 *
 * 核心念头：抡圆了全身力气的一记横扫重拳。它给出的是原生的赌命感——起手长、后摆大，扫出一道扇形；
 * 站在扇面里的人各挨一记接触+拳伤害，并被必定震得混乱（出手会打偏、用力会伤到自己）；走出扇面就落空，
 * 而挥空因为收不住势，要多失衡一会儿。原生 50 命中在这里是位置判定，玩家能从扇面读懂能不能躲开。
 *
 * 两幕：
 *   起（windup，提交前）：大幅后摆、压低，只播预告表现。
 *   击（windback → sweep → impact / overextend）：提交后先回摆 `release` 刻，再在身前扫出扇面；
 *       范围内非友方各结算一次 haymaker，并挂上本单元的混乱载体（共享身份 world_combat:status/confusion）；
 *       一个都没扫中就算挥空，多花 overextend 刻收势。
 *
 * 混乱行为（本单元自己的变体，与家族写法一致）：目标每次想出手都可能被打散；打中非友方时按自身攻击反噬。
 * 配置 reckless（拼命式）由 resolve 改时序、由公式改威力/扇面/混乱时长，提交后才触碰世界。
 */
namespace PokemonSkills {
    const dynamicpunchEffect = "world_combat:dynamicpunch_daze";
    const dynamicpunchScene = "world_combat:move_dynamicpunch";
    const dynamicpunchDazeText = "world_combat.move.dynamicpunch.text.daze";
    const dynamicpunchMissText = "world_combat.move.dynamicpunch.text.miss";
    const dynamicpunchRecoilText = "world_combat.move.dynamicpunch.text.recoil";
    /** 反噬基数（最大生命比例）；被这一拳震懵的目标打中别人时按攻击放大。 */
    const dynamicpunchRecoilFraction = 0.05;

    /** 只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function dynamicpunchCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === dynamicpunchEffect ? effect : null;
    }

    /** 扇形地面的有序顶点：原点 + 从瞄准方向左右各半个张角间采样的弧点。判定与画面用同一组顶点。 */
    function dynamicpunchFan(origin: CombatPoint, direction: CombatPoint, reach: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.min(180, Math.max(5, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.06, origin.z()]];
        for (let i = 0; i <= samples; i++) {
            const angle = base - half + 2 * half * i / samples;
            points.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.06, origin.z() + Math.cos(angle) * reach]);
        }
        return points;
    }

    define({
        id: "dynamicpunch",
        cooldownParameter: "recharge",
        name: "Dynamic Punch",
        description: "The user attacks by punching the target with full concentrated power. This also confuses the target.",
        uses: ["贴身用一道扇面横扫，逼对手走位躲开", "打中就把目标震懵，给队友制造失手窗口", "在对手残血、退无可退时赌一记重拳"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.8,
        prepare: 12,
        active: 20,
        recover: 10,
        cooldown: 44,
        style: "punch",
        defaults: { reckless: false, ai: { maxChase: 7, punishStuck: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dynamicpunch", "swingReach", pokemon), geometry: "circle", style: "punch", color: 0xE0523C, label: "爆裂拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["dynamicpunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("dynamicpunch", "tempo", context)),
                recover: Math.round(p("dynamicpunch", "aftercast", context)),
                cooldown: Math.round(p("dynamicpunch", "recharge", context)),
                range: p("dynamicpunch", "swingReach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dynamicpunch:windup", dynamicpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", reckless: !!(config && config.reckless) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const reach = p("dynamicpunch", "swingReach", action);
            const arc = p("dynamicpunch", "swingArc", action);
            const power = p("dynamicpunch", "haymaker", action);
            const daze = Math.max(20, Math.round(p("dynamicpunch", "dazeTicks", action)));
            const chance = Math.max(0.05, Math.min(0.9, p("dynamicpunch", "fumbleChance", action)));
            const overextend = Math.max(0, Math.round(p("dynamicpunch", "overextend", action)));
            const release = Math.max(0, Math.round(p("dynamicpunch", "release", action)));
            const scale = reach / 2.6;
            const intensity = Math.max(0.6, Math.min(2.4, power / 85));
            sound(action, "minecraft:entity.ravager.roar");
            WorldFeedback.emit(action.world(), dynamicpunchScene, 1, action.origin(),
                { moment: "windback", scale: scale, intensity: intensity }, 18);

            function swing(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { done(current); return; }
                const origin = body.position();
                const direction = aim(current);
                const path = dynamicpunchFan(origin, direction, reach, arc, 10);
                WorldFeedback.emit(scope, dynamicpunchScene, 1, origin,
                    { moment: "sweep", path: path, reach: reach, arc: arc, scale: scale, intensity: intensity,
                        flow: Math.round(160 + arc * 0.9), direction: [direction.x(), direction.y(), direction.z()] }, 24);
                let hits = 0;
                const region = WorldGeometry.sector(origin, direction, reach, arc, { below: 1.5, above: 2.6 });
                WorldGeometry.selectEnemies(scope, region, function (victim, facts) {
                    if (!hurt(current, victim, "dynamicpunch", power,
                        { damage: damageSpec("dynamicpunch", "haymaker"), contact: true, punch: true })) return;
                    hits++;
                    CombatStatus.apply(scope, victim, "confusion", dynamicpunchEffect, daze, Math.round(chance * 100), { unique: true });
                    WorldFeedback.emit(scope, dynamicpunchScene, 1, facts.position(),
                        { moment: "impact", target: String(victim.ref()), intensity: intensity, daze: daze }, 30);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.3, 0)), dynamicpunchDazeText, [], 34);
                });
                if (hits > 0) {
                    sound(current, "cobblemon:move.closecombat.target");
                    done(current);
                    return;
                }
                WorldFeedback.emit(scope, dynamicpunchScene, 1, origin,
                    { moment: "overextend", scale: scale, intensity: intensity }, 24);
                WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.3, 0)), dynamicpunchMissText, [], 26);
                sound(current, "minecraft:entity.player.attack.weak");
                if (overextend > 0) current.after(overextend, function (later: CombatAction) { done(later); });
                else done(current);
            }

            if (release > 0) action.after(release, function (later: CombatAction) { swing(later); });
            else swing(action);
        }
    });


    // 反噬：被震懵的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_dynamicpunch/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (dynamicpunchCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = dynamicpunchRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, dynamicpunchScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), dynamicpunchRecoilText, [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 混乱存续期：低密度的飞鸟每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_dynamicpunch/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dynamicpunchEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "dynamicpunch:" + String(actor.ref()), dynamicpunchScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
