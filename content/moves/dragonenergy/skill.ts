/**
 * 巨龙威能 / dragonenergy 的出手方式。
 *
 * 核心念头：把自身的生命力抽出来、顺着视线凝成一道龙息——起手时一缕缕生命光从身体汇到身前的龙首，
 * 再沿瞄准方向喷成一个前向的锥；锥里的人各挨一次龙威、被沿喷出的方向带走。满血时威能最盛，
 * 越虚弱越小；献祭式真的抽走自己的一部分生命来给这一喷加码。
 *
 * 三幕：
 *   汇（windup，提交前）：生命光从身体汇向身前的龙首，龙首越聚越亮；起手可被打断。
 *   喷（breath → hit）：提交后龙息填满整个锥面；锥内每个敌人各挨一次 `bolt`，被沿喷出方向推 `push`。
 *       献祭式在这一刻抽走最大生命的一部分（`lifeDraw`），并浮出一条抽血提示。
 *   散（fade）：龙息收成几缕残光散去。
 *
 * 这是本族唯一前向可瞄准的招，所以 `kind: "enemy"`：玩家选一个目标，锥就朝它铺开。
 */
namespace PokemonSkills {
    const dragonenergyScene = "world_combat:move_dragonenergy";
    const dragonenergyHitText = "world_combat.move.dragonenergy.text.hit";
    const dragonenergyMissText = "world_combat.move.dragonenergy.text.miss";
    const dragonenergyDrainText = "world_combat.move.dragonenergy.text.drain";

    /** 前向锥的轮廓顶点：origin 起、朝 heading 长 length、半角 angle/2；判定与表现共用同一组顶点。 */
    function dragonenergyCone(origin: CombatPoint, heading: CombatPoint, length: number, angle: number): number[][] {
        const flat = WorldCombat.point(heading.x(), 0, heading.z());
        const dir = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const base = Math.atan2(dir.z(), dir.x());
        const half = Math.max(8, Math.min(70, angle / 2)) * Math.PI / 180;
        const points: number[][] = [[origin.x(), origin.y(), origin.z()]];
        const steps = 8;
        for (let i = 0; i <= steps; i++) {
            const a = base - half + 2 * half * i / steps;
            points.push([origin.x() + Math.cos(a) * length, origin.y(), origin.z() + Math.sin(a) * length]);
        }
        return points;
    }

    define({
        id: "dragonenergy",
        name: "Dragon Energy",
        description: "把自身的生命力凝成一道龙息，沿视线喷成一个前向的锥：锥内所有敌人各挨一次龙威并被沿喷出方向带走。威力随自身剩余血量下降，满血时最盛；献祭式额外抽走一部分生命来加码。",
        uses: ["朝一条线上的敌人一次贯穿", "在满血时打出最高的一记前向龙息", "把成列的敌人一起推出去", "用献祭式换一记拼命的爆发"],
        kind: "enemy",
        range: 8,
        maxRange: 14,
        prepare: 16,
        active: 0,
        recover: 12,
        cooldown: 52,
        maximumTicks: 200,
        style: "dragonbreath",
        defaults: { sacrifice: false, ai: { maxChase: 12, line: true, sacrificeAbove: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonenergy", "coneLength", pokemon), geometry: "cone", style: "dragonbreath",
                color: 0xB06AE8, label: config && config.sacrifice === true ? "献祭龙威" : "巨龙威能" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["dragonenergy"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            const sacrifice = !!(config && config.sacrifice);
            return {
                prepare: Math.round(p("dragonenergy", "chargeTicks", context) + (sacrifice ? 2 : 0)),
                recover: Math.round(p("dragonenergy", "recover", context)),
                cooldown: Math.round(p("dragonenergy", "cooldown", context) + (sacrifice ? 4 : 0)),
                active: skills["dragonenergy"].active,
                range: p("dragonenergy", "coneLength", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("dragonenergy:charge", dragonenergyScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: prepare, focus: Math.round(p("dragonenergy", "focusCount", action)),
                    length: p("dragonenergy", "coneLength", action), angle: p("dragonenergy", "coneAngle", action),
                    sacrifice: config && config.sacrifice === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const victimBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const aim = victimBody !== null ? victimBody.position() : action.targetPosition();
            let heading = aim.minus(origin);
            if (heading.length() < 0.05) heading = action.direction();
            const flat = WorldCombat.point(heading.x(), 0, heading.z());
            const direction = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
            action.face(aim, 22, 22);

            const power = p("dragonenergy", "bolt", action);
            const length = Math.max(6, p("dragonenergy", "coneLength", action));
            const angle = Math.max(24, Math.min(64, p("dragonenergy", "coneAngle", action)));
            const push = p("dragonenergy", "push", action);
            const focus = Math.max(14, Math.round(p("dragonenergy", "focusCount", action)));
            const sacrifice = !!(config && config.sacrifice);
            const intensity = Math.max(0.6, Math.min(2.4, power / 110));
            const polygon = dragonenergyCone(origin, direction, length, angle);
            let hits = 0;

            if (sacrifice) {
                const draw = Math.max(0.02, p("dragonenergy", "lifeDraw", action));
                world.health(actor, -body.maxHealth() * draw, "world_combat:life_force");
                WorldFeedback.emit(world, dragonenergyScene, 1, origin,
                    { moment: "drain", draw: Math.max(6, Math.round(draw * 100)), focus: focus,
                        direction: [direction.x(), direction.y(), direction.z()], scale: length / 8 }, 22);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, body.height() + 0.3, 0)), dragonenergyDrainText, [], 22);
            }

            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, length, angle, { below: 2.8, above: 3.6 }),
                function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref())) return;
                    if (!hurt(action, enemy, "dragonenergy", power, { damage: damageSpec("dragonenergy", "dragon") })) return;
                    hits++;
                    if (world.valid(enemy)) world.displace(enemy, direction.scale(push));
                    WorldFeedback.emit(world, dragonenergyScene, 1, facts.position(),
                        { moment: "hit", target: ref, count: Math.round(10 + focus * 0.4), scale: length / 8, intensity: intensity }, 24);
                });

            WorldFeedback.emit(world, dragonenergyScene, 1, origin,
                { moment: "breath", path: polygon, length: length, angle: angle, focus: focus, hits: hits,
                    direction: [direction.x(), direction.y(), direction.z()], scale: length / 8,
                    intensity: intensity, sacrifice: sacrifice ? 1 : 0 }, 28);
            sound(action, "minecraft:entity.ender_dragon.shoot");
            sound(action, "cobblemon:impact.dragon");
            WorldFeedback.keep(world, "dragonenergy:fade:" + String(actor.ref()), dragonenergyScene, 1, origin,
                { moment: "fade", length: length, angle: angle, scale: length / 8,
                    direction: [direction.x(), direction.y(), direction.z()], focus: Math.round(focus * 0.5) }, 24);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, body.height() + 0.3, 0)),
                hits > 0 ? dragonenergyHitText : dragonenergyMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
