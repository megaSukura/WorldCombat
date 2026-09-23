/**
 * 冲天拳 / skyuppercut 的出手方式。
 *
 * 核心念头：**蹲身把拳压到最低，再沿身前一条竖直的弧线一口气挑上去**——被挑中的人被整个顶离地面（垂直位移，
 * 而不是沿地面推远），离地的人会在空中停一瞬；对已经离地的目标这一挑更狠，拳能挑到头顶 `airReach` 格高，
 * 这就是原生「可命中空中」的落点。它是全族唯一把对手送上天的一记。
 *
 * 三幕：
 *   起（windup，提交前）：压身、拳收到腰下、脚下蹬劲，只播预告。
 *   挑（rise）：提交后沿身前 `arc` 度的竖直弧挑出 `uppercut` 接触伤害，弧内的非友方各吃一记；
 *       被挑中的目标沿弧线被 `displace` 送出一小段水平、并得到 `lift` 的向上初速——整个人离地。
 *   收（hang／whiff）：离地的目标头顶浮起一圈停留标记；一个人都没挑中只留一道空弧。
 *
 * 与同族分开：百万吨重拳是沿地面的直拳推离、臂锤是过顶下砸、地球上投/借力摔是抓取摔出；
 * 冲天拳是唯一「垂直向上、把人顶到空中」的一记。
 *
 * 配置 `rising` 由公式改威力与挑高，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const skyuppercutScene = "world_combat:move_skyuppercut";
    const skyuppercutHitText = "world_combat.move.skyuppercut.text.hit";
    const skyuppercutAirText = "world_combat.move.skyuppercut.text.air";
    const skyuppercutMissText = "world_combat.move.skyuppercut.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function skyuppercutHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 上勾的竖直弧：从腰下一点沿身前向上挑到头顶，三个顶点给判定与表现共用。 */
    function skyuppercutArc(origin: CombatPoint, heading: CombatPoint, reach: number, height: number): number[][] {
        const low = origin.plus(heading.scale(reach * 0.25)).minus(WorldCombat.point(0, 0.5, 0));
        const mid = origin.plus(heading.scale(reach * 0.55)).plus(WorldCombat.point(0, height * 0.4, 0));
        const high = origin.plus(heading.scale(reach * 0.7)).plus(WorldCombat.point(0, height, 0));
        return [[low.x(), low.y(), low.z()], [mid.x(), mid.y(), mid.z()], [high.x(), high.y(), high.z()]];
    }

    define({
        id: "skyuppercut",
        cooldownParameter: "recharge",
        name: "Sky Uppercut",
        description: "蹲身把拳压到最低，再沿身前一条竖直的弧线一口气挑上去：被命中的对手整个被顶离地面，随后落回；对命中时已经离地的目标这一挑更狠。它是全族唯一把对手送上天的一记。",
        uses: ["一记上勾把贴脸的对手顶到空中", "追击空中或跳起的对手、把它打得更狠", "把敌人挑离阵地，给下一拍创造机会"],
        kind: "enemy",
        range: 2.3,
        maxRange: 3.2,
        prepare: 8,
        active: 14,
        recover: 9,
        cooldown: 32,
        style: "punch",
        defaults: { rising: true, ai: { maxChase: 5, punishAir: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("skyuppercut", "reach", pokemon), geometry: "cone", style: "punch", color: 0xFFC06A,
                label: config && config.rising === false ? "贯顶式" : "冲天式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["skyuppercut"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("skyuppercut", "tempo", context)),
                recover: Math.round(p("skyuppercut", "aftercast", context)),
                cooldown: Math.round(p("skyuppercut", "recharge", context)),
                active: skills["skyuppercut"].active,
                range: p("skyuppercut", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_skyuppercut:windup", skyuppercutScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", windup: prepare, rising: config && config.rising !== false }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const heading = skyuppercutHeading(aim(action));
            const reach = Math.max(1.7, p("skyuppercut", "reach", action));
            const arc = Math.max(40, Math.min(110, p("skyuppercut", "arc", action)));
            const airReach = Math.max(1.6, p("skyuppercut", "airReach", action));
            const lift = Math.max(0.15, p("skyuppercut", "lift", action));
            const push = Math.max(0, p("skyuppercut", "push", action));
            const airBonus = Math.max(1, p("skyuppercut", "airBonus", action));
            const power = p("skyuppercut", "uppercut", action);
            const sparks = Math.max(8, Math.round(p("skyuppercut", "sparks", action)));
            const scale = Math.max(0.6, Math.min(1.8, airReach / 2.4));
            const intensity = Math.max(0.6, Math.min(2.3, power / 85));

            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const path = skyuppercutArc(origin, heading, reach, airReach);

            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, skyuppercutScene, 1, origin,
                { moment: "rise", path: path, reach: reach, arc: arc, airReach: airReach,
                    sparks: sparks, scale: scale, intensity: intensity,
                    direction: [heading.x(), heading.y(), heading.z()] }, 18);

            let launched = 0, airborne = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, heading, reach, arc, { below: 0.8, above: airReach }),
                function (victim: CombatActor, facts: CombatObservation) {
                    const offGround = !facts.grounded();
                    const per = power * (offGround ? airBonus : 1);
                    if (!hurt(action, victim, "skyuppercut", per,
                        { damage: damageSpec("skyuppercut", "uppercut"), contact: true, punch: true })) return;
                    launched++;
                    if (offGround) airborne++;
                    WorldFeedback.emit(world, skyuppercutScene, 1, facts.position(),
                        { moment: "launch", target: String(victim.ref()), lift: lift, push: push, offGround: offGround ? 1 : 0,
                            sparks: sparks, scale: scale, intensity: intensity }, 20);
                    if (offGround)
                        WorldFeedback.emit(world, skyuppercutScene, 1, facts.position(),
                            { moment: "hang", target: String(victim.ref()), scale: scale, intensity: intensity }, 24);
                    if (world.valid(victim)) {
                        world.displace(victim, heading.scale(push));
                        world.motion(victim, WorldCombat.point(0, lift, 0), true);
                    }
                });

            const above = origin.plus(WorldCombat.point(0, 1.2, 0));
            if (launched === 0) {
                WorldFeedback.emit(world, skyuppercutScene, 1, origin.plus(heading.scale(reach * 0.6)).plus(WorldCombat.point(0, 0.6, 0)),
                    { moment: "whiff", scale: scale, intensity: intensity }, 18);
                WorldFeedback.text(world, above, skyuppercutMissText, [], 22);
                sound(action, "minecraft:entity.player.attack.weak");
            } else if (airborne > 0) {
                WorldFeedback.text(world, above, skyuppercutAirText, [launched], 24);
                sound(action, "cobblemon:impact.fighting");
            } else {
                WorldFeedback.text(world, above, skyuppercutHitText, [launched], 24);
                sound(action, "cobblemon:impact.fighting");
            }
            done(action);
        }
    });
}
