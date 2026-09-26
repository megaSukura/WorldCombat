/**
 * 巨龙威能 / dragonenergy 的出手方式。
 *
 * 核心念头：把自身的生命力抽出来、顺着视线凝成一道龙息——起手时一缕缕生命光从身体汇到身前的龙首，
 * 再沿瞄准方向喷成一个真正的前向锥（可向上喷向高台）；锥里的人各挨一次龙威、被沿喷出的方向带走。
 * 满血时威能最盛，越虚弱越小；献祭式真的抽走自己的一部分生命来给这一喷加码。
 *
 * 三幕：
 *   汇（windup，提交前）：生命光沿瞄准方向从身体汇向身前，龙首越聚越亮；起手可被打断。
 *   喷（breath → hit）：提交后龙息填满整个 3D 锥面；锥内每个敌人各挨一次 `bolt`，被沿喷出方向推 `push`。
 *       献祭式在这一刻抽走最大生命的一部分（`lifeDraw`），并浮出一条抽血提示；威力在抽血之前快照。
 *   散（fade）：龙息收成几缕残光散去。
 *
 * 这是本族唯一前向可瞄准的招，所以 `kind: "aim"`：方向、世界点或任意阵营实体都能放，允许空喷；
 * 锥的判定（3D 点积）与画面（cone_volume）读同一组朝向／长度／半角，墙会裁掉那一路龙息。
 */
namespace PokemonSkills {
    const dragonenergyScene = "world_combat:move_dragonenergy";
    const dragonenergyHitText = "world_combat.move.dragonenergy.text.hit";
    const dragonenergyMissText = "world_combat.move.dragonenergy.text.miss";
    const dragonenergyDrainText = "world_combat.move.dragonenergy.text.drain";

    /** 3D 龙息锥的实体判定：以锥心为顶点、沿 axis 张开半角，推出 reach 格；与画面 cone_volume 同源。 */
    function dragonenergyInCone(centre: CombatPoint, axis: CombatPoint, reach: number, cosHalf: number, point: CombatPoint): boolean {
        const delta = point.minus(centre), distance = delta.length();
        if (distance > reach) return false;
        if (distance < 0.35) return true;
        return (delta.x() * axis.x() + delta.y() * axis.y() + delta.z() * axis.z()) / distance >= cosHalf - 1e-9;
    }

    define({
        id: "dragonenergy",
        name: "Dragon Energy",
        description: "把自身的生命力凝成一道龙息，沿瞄准方向喷成一个前向的锥（可朝上空喷）：锥内所有敌人各挨一次龙威并被沿喷出方向带走，墙会截住龙息。威力随自身剩余血量下降，满血时最盛；献祭式额外抽走一部分生命来加码。",
        uses: ["朝一条线上的敌人一次贯穿", "在满血时打出最高的一记前向龙息", "把成列的敌人一起推出去", "用献祭式换一记拼命的爆发"],
        kind: "aim",
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
            const delta = action.targetPosition().minus(action.origin());
            const direction = delta.length() < 0.05 ? action.direction() : delta.unit();
            action.present("dragonenergy:charge", dragonenergyScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", charge: prepare, focus: Math.round(p("dragonenergy", "focusCount", action)),
                    length: p("dragonenergy", "coneLength", action), angle: p("dragonenergy", "coneAngle", action),
                    direction: [direction.x(), direction.y(), direction.z()],
                    sacrifice: config && config.sacrifice === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const raw = aim(action);
            const axis = raw.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : raw.unit();
            action.face(origin.plus(axis.scale(4)), 22, 22);

            // 威力在献祭抽血之前快照：说明里的「原 HP 威力」与实际结算一致。
            const power = p("dragonenergy", "bolt", action);
            const length = Math.max(6, p("dragonenergy", "coneLength", action));
            const angle = Math.max(24, Math.min(64, p("dragonenergy", "coneAngle", action)));
            const half = Math.max(6, Math.min(80, angle / 2));
            const cosHalf = Math.cos(half * Math.PI / 180);
            const push = p("dragonenergy", "push", action);
            const focus = Math.max(14, Math.round(p("dragonenergy", "focusCount", action)));
            const sacrifice = !!(config && config.sacrifice);
            const intensity = Math.max(0.6, Math.min(2.4, power / 110));
            let hits = 0;

            if (sacrifice) {
                const draw = Math.max(0.02, p("dragonenergy", "lifeDraw", action));
                const drained = Math.max(0, -world.health(actor, -body.maxHealth() * draw, "world_combat:life_force"));
                WorldFeedback.emit(world, dragonenergyScene, 1, origin,
                    { moment: "drain", draw: Math.max(6, Math.min(60, Math.round(drained))), focus: focus,
                        direction: [axis.x(), axis.y(), axis.z()], scale: length / 8 }, 22);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, body.height() + 0.3, 0)), dragonenergyDrainText, [], 22);
            }

            // 覆盖球做宿主预筛，再用 3D 点积锥精确筛选，墙用 clear 裁掉；朝向／长度／半角与画面同源。
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(origin, 0, length, { below: length, above: length }),
                function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref())) return;
                    const at = facts.position();
                    if (!dragonenergyInCone(origin, axis, length, cosHalf, at)) return;
                    if (!world.clear(origin, at)) return;
                    if (!hurt(action, enemy, "dragonenergy", power, { damage: damageSpec("dragonenergy", "bolt") })) return;
                    hits++;
                    if (world.valid(enemy)) world.hitDisplace(enemy, axis.scale(push));
                    WorldFeedback.emit(world, dragonenergyScene, 1, at,
                        { moment: "hit", target: ref, count: Math.round(10 + focus * 0.4), scale: length / 8, intensity: intensity }, 24);
                });

            WorldFeedback.emit(world, dragonenergyScene, 1, origin,
                { moment: "breath", direction: [axis.x(), axis.y(), axis.z()], length: length, half: half, focus: focus,
                    hits: hits, scale: length / 8, intensity: intensity, sacrifice: sacrifice ? 1 : 0 }, 28);
            sound(action, "minecraft:entity.ender_dragon.shoot");
            sound(action, "cobblemon:impact.dragon");
            WorldFeedback.keep(world, "dragonenergy:fade:" + String(actor.ref()), dragonenergyScene, 1, origin,
                { moment: "fade", length: length, half: half, direction: [axis.x(), axis.y(), axis.z()],
                    focus: Math.round(focus * 0.5), scale: length / 8 }, 24);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, body.height() + 0.3, 0)),
                hits > 0 ? dragonenergyHitText : dragonenergyMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
