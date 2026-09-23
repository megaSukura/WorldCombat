/**
 * 啄钻 / drillpeck 的出手方式。
 *
 * 核心念头：**原地旋起来，把身体拧成一支钻，贴着身前一条短轴一下一下地把尖喙钻进去**——伤害是一条速率而不是一记，
 * 每一口把对手往后顶一点；对手离地时每一口更狠（尖喙专钻空中的破绽，原生可命中空中）。它是全族唯一的持续接触钻孔。
 *
 * 三幕：
 *   起（windup，提交前）：原地转起来、翅与喙拉出螺旋，只播预告。
 *   钻（bore）：提交后朝目标垫进 `lunge` 格，沿身前 `reach` 格长、`bore` 为半径的短轴每 `gap` 刻钻一口；
 *       每一口对轴上的第一个非友方结算 `bite` 接触伤害（离地目标乘 `airBonus`）并顶开 `push` 格。
 *   收：目标离开轴心就收起钻头（drift）；一口没咬中只留旋了个空。
 *
 * 与同族分开：直冲钻是贴地钻穿一整排并犁沟、抓是一爪多道同时划出、连斩是越打越多刀的攒节奏；
 * 啄钻是唯一「原地停留、连续几口、把目标一口口往后顶」的接触钻孔。
 *
 * 配置 `deep` 由公式改口数、每口威力与对空加成，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const drillpeckScene = "world_combat:move_drillpeck";
    const drillpeckHitText = "world_combat.move.drillpeck.text.hit";
    const drillpeckMissText = "world_combat.move.drillpeck.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function drillpeckHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 钻轴的两个端点：判定与表现共用。 */
    function drillpeckAxis(origin: CombatPoint, heading: CombatPoint, reach: number): number[][] {
        const end = origin.plus(heading.scale(reach));
        return [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]];
    }

    define({
        id: "drillpeck",
        cooldownParameter: "recharge",
        name: "Drill Peck",
        description: "A corkscrewing attack that strikes the target with a sharp beak acting as a drill.",
        uses: ["原地旋成一支钻，连续几口钻同一个目标", "把贴脸的目标一口口往后顶开", "对离地的目标钻得更狠"],
        kind: "enemy",
        range: 2.5,
        maxRange: 3.4,
        prepare: 10,
        active: 30,
        recover: 8,
        cooldown: 30,
        style: "peck",
        defaults: { deep: false, ai: { maxChase: 5, diveAir: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("drillpeck", "reach", pokemon), geometry: "line", style: "peck", color: 0x9FD6FF,
                label: config && config.deep === true ? "深钻式" : "快钻式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["drillpeck"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            const bites = Math.max(1, Math.round(p("drillpeck", "bites", context)));
            const gap = Math.max(1, Math.round(p("drillpeck", "gap", context)));
            return {
                prepare: Math.round(p("drillpeck", "spinUp", context)),
                recover: Math.round(p("drillpeck", "aftercast", context)),
                cooldown: Math.round(p("drillpeck", "recharge", context)),
                active: Math.min(120, bites * gap + 4),
                range: p("drillpeck", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_drillpeck:windup", drillpeckScene, 1, action.origin(),
                JSON.stringify({ moment: "spin", spinUp: prepare, deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const deep = config && config.deep === true;
            const heading = drillpeckHeading(aim(action));
            const reach = Math.max(1.8, p("drillpeck", "reach", action));
            const bore = Math.max(0.22, p("drillpeck", "bore", action));
            const bites = Math.max(1, Math.min(8, Math.round(p("drillpeck", "bites", action))));
            const gap = Math.max(1, Math.min(6, Math.round(p("drillpeck", "gap", action))));
            const lunge = Math.max(0, p("drillpeck", "lunge", action));
            const push = Math.max(0, p("drillpeck", "push", action));
            const airBonus = Math.max(1, p("drillpeck", "airBonus", action));
            const power = p("drillpeck", "bite", action);
            const shavings = Math.max(8, Math.round(p("drillpeck", "shavings", action)));
            const scale = Math.max(0.6, Math.min(1.8, reach / 2.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 16));

            const self = world.observe(actor);
            if (self !== null && lunge > 0.05) {
                const target = action.target();
                const body = target !== null && world.valid(target) ? world.observe(target) : null;
                const delta = body !== null ? body.position().minus(self.position()) : heading.scale(lunge);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const advance = Math.min(lunge, Math.max(0, flat - bore - 0.2));
                if (advance > 0.02) world.displace(actor, heading.scale(advance));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            sound(action, "minecraft:item.trident.riptide_1");
            WorldFeedback.emit(world, drillpeckScene, 1, origin,
                { moment: "bore", path: drillpeckAxis(origin, heading, reach), reach: reach, bites: bites,
                    shavings: shavings, scale: scale, intensity: intensity,
                    direction: [heading.x(), heading.y(), heading.z()] }, 22);

            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? origin : body.position();
                if (landed === 0) {
                    WorldFeedback.emit(scope, drillpeckScene, 1, at.plus(heading.scale(reach * 0.7)),
                        { moment: "whiff", scale: scale, intensity: intensity }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), drillpeckMissText, [], 22);
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), drillpeckHitText, [landed], 22);
                }
                done(current);
            }

            function chomp(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const from = body.position();
                const found: CombatActor[] = [];
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(from, heading, reach, bore, { below: 1.2, above: 2.6 }),
                    function (candidate: CombatActor) { if (found.length === 0) found.push(candidate); });
                if (found.length === 0) {
                    WorldFeedback.emit(scope, drillpeckScene, 1, from.plus(heading.scale(reach * 0.7)),
                        { moment: "drift", index: index, scale: scale, intensity: intensity }, 16);
                    finish(current);
                    return;
                }
                const victim = found[0];
                const foe = scope.observe(victim);
                if (foe !== null) {
                    const airborne = !foe.grounded();
                    const per = power * (airborne ? airBonus : 1);
                    if (hurt(current, victim, "drillpeck", per, { damage: damageSpec("drillpeck", "bite"), contact: true })) {
                        landed++;
                        WorldFeedback.emit(scope, drillpeckScene, 1, foe.position(),
                            { moment: "bite", target: String(victim.ref()), index: index, bites: bites,
                                airborne: airborne ? 1 : 0, shavings: shavings, scale: scale, intensity: intensity }, 16);
                        if (airborne)
                            WorldFeedback.emit(scope, drillpeckScene, 1, foe.position(),
                                { moment: "dive", target: String(victim.ref()), index: index, airBonus: airBonus,
                                    scale: scale, intensity: intensity }, 20);
                        if (landed === 1) sound(current, "cobblemon:impact.flying");
                        else sound(current, "minecraft:entity.player.attack.weak");
                        if (scope.valid(victim)) scope.displace(victim, heading.scale(push));
                    }
                }
                index++;
                if (index >= bites) { finish(current); return; }
                current.after(gap, chomp);
            }

            chomp(action);
        }
    });
}
