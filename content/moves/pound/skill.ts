/**
 * 拍击 / pound 的出手方式。
 *
 * 核心念头：**抬手在身前扫出一记短扇面**——没有蓄势、没有冲步，拍到扇面里的东西就各挨一下、各被拍到一边。
 * 它是全族最便宜的一记：快拍式抬手即出、收招几乎为零、冷却最短；代价是单发最低、扇面浅，只有贴身
 * 并排的目标才一起吃到。重拍式把这一下做得更沉更宽、能拍开一步，但多出起手与更长的冷却。
 *
 * 两幕：
 *   起（windup，仅重拍式，提交前）：抬掌蓄势的预告；快拍式没有这一幕，开始即提交。
 *   拍（swat）：提交后以瞄准方向为中心，在身前铺开 `arc` 度的扇形、探出 `reach` 格；扇面里的非友方
 *       各结算一记 swat 接触伤害，并被沿拍向推开 `nudge` 格。拍到几个、碎屑多少都从这一拍算出。
 *   果：一个人都没拍到只留一掌破风。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体、也可只给一个方向或世界点，没点到敌人也照样拍出整片扇面；
 *   扇面被实墙挡住时拍不进去（方块挡手）。攻击许可仍由命中层决定，AI 仍按仇恨推荐敌人。
 *
 * 与同族分开：摔打慢而重、打点会落空；拍击是所有打击招里唯一「瞬发＋扇面扫」的一记。
 * 配置 `heavy`（重拍式）由 resolve 改时序、由公式改威力／扇面／推距，提交后才触碰世界。
 */
namespace PokemonSkills {
    const poundScene = "world_combat:move_pound";
    const poundHitText = "world_combat.move.pound.text.hit";
    const poundMissText = "world_combat.move.pound.text.miss";

    /** 把瞄准方向压平成水平单位向量。 */
    function poundHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 扇面的有序顶点：圆心 + 沿 `arc` 度均匀铺开的弧点；判定与表现共用这一组点。 */
    function poundFan(origin: CombatPoint, heading: CombatPoint, reach: number, arcDegrees: number): number[][] {
        const base = Math.atan2(heading.x(), heading.z());
        const half = Math.max(10, Math.min(170, arcDegrees)) * Math.PI / 360;
        const steps = Math.max(4, Math.round(Math.max(10, Math.min(170, arcDegrees)) / 18));
        const path: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + (2 * half) * (i / steps);
            const point = origin.plus(WorldCombat.point(Math.sin(angle) * reach, 0, Math.cos(angle) * reach));
            path.push([point.x(), point.y(), point.z()]);
        }
        return path;
    }

    define({
        id: "pound",
        cooldownParameter: "recharge",
        name: "Pound",
        description: "抬手在身前扫出一记短扇面：快拍式没有蓄势，重拍式多一拍起手；拍到扇面里的目标就各挨一下、各被拍到一边。它是全族最便宜的一招——冷却最短，一次能拍到贴身并排的几个目标；代价是单发最低、扇面很浅。可点任意目标，也可只朝一个方向空拍；扇面被墙挡住就拍不进去。",
        uses: ["瞬发的一记便宜近身拍击", "一次拍到贴身并排的几个目标", "在别的招之间随手补一下"],
        kind: "aim",
        range: 1.9,
        maxRange: 2.7,
        prepare: 3,
        active: 8,
        recover: 3,
        cooldown: 16,
        style: "swat",
        defaults: { heavy: false, ai: { maxChase: 3, swarm: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("pound", "reach", pokemon), geometry: "cone", style: "swat", color: 0xF0E6CE,
                label: config && config.heavy === true ? "重拍式" : "快拍式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["pound"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("pound", "tempo", context)),
                recover: Math.round(p("pound", "aftercast", context)),
                cooldown: Math.round(p("pound", "recharge", context)),
                active: skills["pound"].active,
                range: p("pound", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            if (prepare <= 0) return 0;
            action.present("world_combat:move_pound:raise", poundScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", heavy: 1, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const heading = poundHeading(aim(action));
            const reach = Math.max(1.3, p("pound", "reach", action));
            const arc = Math.max(70, Math.min(172, p("pound", "arc", action)));
            const power = p("pound", "swat", action);
            const nudge = Math.max(0, p("pound", "nudge", action));
            const crumble = Math.max(8, Math.round(p("pound", "crumble", action)));
            const scale = Math.max(0.7, Math.min(1.6, reach / 1.75));
            const intensity = Math.max(0.5, Math.min(2.2, power / 44));
            const fan = poundFan(origin, heading, reach, arc);
            const struck: string[] = [];

            const edge = Math.max(6, Math.round(arc / 12));

            WorldFeedback.emit(world, poundScene, 1, origin,
                { moment: "swat", path: fan, arc: arc, edge: edge, reach: reach, scale: scale, intensity: intensity }, 12);

            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, heading, reach, arc, { below: 1.2, above: 2.4 }),
                function (victim, facts) {
                    // 方块挡手：扇面探到墙就停，隔墙拍不到人。
                    if (!world.clear(origin, facts.position())) return;
                    if (!hurt(action, victim, "pound", power,
                        { damage: damageSpec("pound", "swat"), contact: true })) return;
                    struck.push(String(victim.ref()));
                    if (world.valid(victim) && nudge > 0.01) world.hitDisplace(victim, heading.scale(nudge));
                    WorldFeedback.emit(world, poundScene, 1, facts.position(),
                        { moment: "hit", target: String(victim.ref()), count: crumble, scale: scale, intensity: intensity }, 16);
                });

            sound(action, "minecraft:entity.player.attack.weak");
            const above = origin.plus(WorldCombat.point(0, 1.1, 0));
            if (struck.length === 0) {
                WorldFeedback.emit(world, poundScene, 1, origin, { moment: "whiff", scale: scale, intensity: intensity }, 14);
                WorldFeedback.text(world, above, poundMissText, [], 18);
            } else {
                WorldFeedback.text(world, above, poundHitText, [struck.length], 20);
                sound(action, "cobblemon:impact.normal");
            }
            done(action);
        }
    });
}
