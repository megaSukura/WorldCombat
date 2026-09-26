/**
 * 冲天拳 / skyuppercut 的出手方式。
 *
 * 核心念头：**蹲身把拳压到最低，再沿身前一条竖直的弧线一口气挑上去**——被挑中的人被整个顶离地面（垂直位移，
 * 而不是沿地面推远），离地的人会在空中停一瞬；对已经离地的目标这一挑更狠，拳能挑到头顶 `airReach` 格高，
 * 这就是原生「可命中空中」的落点。它是全族唯一把对手送上天的一记。
 *
 * 三幕：
 *   起（windup，提交前）：压身、拳收到腰下、脚下蹬劲，只播预告。
 *   挑（rise）：提交后沿身前 `arc` 度的竖直弧由低到高采样两段相邻区域，弧内的非友方各吃一记 `uppercut`；
 *       每个目标整招只结算一次（低段或高段先罩到就锁定），总威力不变。被挑中的目标得到 `lift` 的向上初速——
 *       整个人离地；只有真的被推动/顶起的才播起跳轨迹，免疫击飞者保留伤害、不加升空。
 *   收（hang／whiff）：离地命中另起更亮的空中强调（不表示悬停）；一个人都没挑中只留一道空弧。
 *
 * 选取 `kind: "aim"`：自由朝向、可空拳；方向或任意阵营实体都行。头顶有墙就把可见拳路截断到天花板。
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
        kind: "aim",
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

            // 头顶有墙就把可见拳路截断到天花板；判定与表现共用截断后的弧线。
            let top = airReach;
            const ceiling = world.clipBlocks(origin.plus(WorldCombat.point(0, 0.4, 0)),
                origin.plus(WorldCombat.point(0, airReach + 0.6, 0)));
            const ceilingBlock = ceiling !== null && ceiling.blocked() ? ceiling.blockPosition() : null;
            if (ceilingBlock !== null) top = Math.max(1.2, Math.min(airReach, ceilingBlock.y() - origin.y()));
            const path = skyuppercutArc(origin, heading, reach, top);

            sound(action, "minecraft:entity.player.attack.strong");
            WorldFeedback.emit(world, skyuppercutScene, 1, origin,
                { moment: "rise", path: path, reach: reach, arc: arc, airReach: top,
                    sparks: sparks, scale: scale, intensity: intensity,
                    direction: [heading.x(), heading.y(), heading.z()] }, 18);

            // 竖向范围拆成低、高两段相邻采样，按低到高推进：每段各自结算，已锁定的目标不再重复吃伤，总威力不变。
            const struck: { [ref: string]: boolean } = Object.create(null);
            const middle = Math.max(1.4, Math.min(top - 0.2, top * 0.55));
            const bands = [{ below: 0.8, above: middle }, { below: -middle, above: top }];
            let launched = 0, airborne = 0;
            for (let band = 0; band < bands.length; band++) {
                WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, heading, reach, arc, bands[band]),
                    function (victim: CombatActor, facts: CombatObservation) {
                        const ref = String(victim.ref());
                        if (struck[ref]) return;
                        if (!world.clear(origin, facts.position())) return;
                        const offGround = !facts.grounded();
                        const per = power * (offGround ? airBonus : 1);
                        if (!hurt(action, victim, "skyuppercut", per,
                            { damage: damageSpec("skyuppercut", "uppercut"), contact: true, punch: true })) return;
                        struck[ref] = true;
                        launched++;
                        if (offGround) airborne++;
                        // 只有真的被顶起或推出去的目标才播起跳轨迹：免疫击飞者位移为 0、加不上速度，保留伤害。
                        const moved = world.hitDisplace(victim, heading.scale(push));
                        const lifted = world.hitImpulse(victim, WorldCombat.point(0, lift, 0));
                        if (moved > 0.001 || lifted)
                            WorldFeedback.emit(world, skyuppercutScene, 1, facts.position(),
                                { moment: "launch", target: ref, lift: lift, push: push, offGround: offGround ? 1 : 0,
                                    sparks: sparks, scale: scale, intensity: intensity }, 20);
                        if (offGround)
                            WorldFeedback.emit(world, skyuppercutScene, 1, facts.position(),
                                { moment: "hang", target: ref, scale: scale, intensity: intensity }, 20);
                    });
            }

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
