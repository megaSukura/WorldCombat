/**
 * 高速旋转 / rapidspin 的出手方式。
 *
 * 核心念头：原地旋成一圈风。重心一沉、身体贴地高速自转，把缠在身上的束缚甩脱，同时以自身为心扫开身边的人，
 *   借转速提一口气（速度 +1 级）。它是最快的脱身手段，也是唯一让自己变快的一招。
 *
 * 三幕（提交前只播预告）：
 *   起（wind，提交前）：重心下沉、风从脚边起旋，只播一记预告。
 *   旋（spin → hit）：提交后原地旋 `rings` 圈——先把身上的 rooted 世界效果与共享身份 partiallytrapped／
 *       trapped／leechseed 一并甩掉，再以自身 `radius` 为半径扫一圈，圈内每个敌人各挨一记接触伤害并被向外
 *       顶开 `push`；同时自身速度 +`haste` 级。
 *   散（settle）：风散去。
 *
 * 与同族分开：晶光转转同样脱缚，但它是把毒甩到周围、给自己不加速度；高速旋转是把自己变快。束缚与守护都
 *   是共享机制（CombatStatus 身份、world_combat:rooted、GuardEffects），对任何战斗者一视同仁。
 *
 * 配置 `wide` 由公式改威力／半径／风屑／顶开与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const rapidspinScene = "world_combat:move_rapidspin";
    const rapidspinFreeText = "world_combat.move.rapidspin.text.free";
    const rapidspinHitText = "world_combat.move.rapidspin.text.hit";
    const rapidspinHasteText = "world_combat.move.rapidspin.text.haste";

    /** 甩脱缠在身上的东西：rooted 世界效果与共享身份 partiallytrapped／trapped／leechseed；返回甩掉的条数。 */
    function rapidspinSlip(world: CombatWorld, actor: CombatActor): number {
        let freed = 0;
        const roots = world.effects(actor, "world_combat:rooted");
        for (let index = 0; index < roots.length; index++) if (world.operation(roots[index].id(), "world_combat:dispel", "{}")) freed++;
        if (CombatStatus.cure(world, actor, "partiallytrapped")) freed++;
        if (CombatStatus.cure(world, actor, "trapped")) freed++;
        if (CombatStatus.cure(world, actor, "leechseed")) freed++;
        return freed;
    }

    define({
        id: "rapidspin",
        cooldownParameter: "recharge",
        name: "Rapid Spin",
        description: "原地旋成一圈风，把身上的定身与绑紧、紧束、寄生种子一并甩脱，同时扫开身周一圈的敌人并把它们顶开，随后自己的速度提高一级。广旋式扫得更开，紧旋式转得更重。",
        uses: ["被绑紧、紧束或寄生种子缠住时脱身", "被围住时把贴身的人一起旋开", "顺手给自己垫一段速度"],
        kind: "self",
        range: 2.8,
        maxRange: 5.2,
        prepare: 7,
        active: 8,
        recover: 6,
        cooldown: 26,
        style: "spin",
        stationary: true,
        defaults: { wide: false, ai: { maxChase: 8, cluster: true } },
        fields: [flag("wide", "广旋")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("rapidspin", "radius", pokemon) : 2.8, geometry: "area", style: "spin", color: 0xBFD8E8,
                label: config && config.wide === true ? "高速旋转·广旋" : "高速旋转·紧旋" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["rapidspin"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("rapidspin", "tempo", context)),
                recover: Math.round(p("rapidspin", "recover", context)),
                cooldown: Math.round(p("rapidspin", "recharge", context)),
                active: 8,
                range: p("rapidspin", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_rapidspin:wind", rapidspinScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", wide: config && config.wide === true ? 1 : 0,
                    wind: Math.round(p("rapidspin", "wind", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(1.6, p("rapidspin", "radius", action));
            const power = p("rapidspin", "spin", action);
            const rings = Math.max(2, Math.round(p("rapidspin", "rings", action)));
            const push = p("rapidspin", "push", action);
            const haste = Math.max(1, Math.round(p("rapidspin", "haste", action)));
            const wind = Math.max(10, Math.round(p("rapidspin", "wind", action)));
            const cap = Math.max(1, Math.round(p("rapidspin", "maxTargets", action)));
            const scale = radius / 2.8;
            const freed = rapidspinSlip(world, actor);
            let hits = 0;

            sound(action, "cobblemon:move.quickattack.actor");
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0.3, radius, { below: 2, above: 2 }), function (enemy, facts) {
                if (hits >= cap || String(enemy.ref()) === String(actor.ref())) return;
                if (!hurt(action, enemy, "rapidspin", power, { damage: damageSpec("rapidspin", "spin"), contact: true })) return;
                hits++;
                const away = facts.position().minus(centre);
                if (world.valid(enemy) && away.length() > 0.2)
                    world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                WorldFeedback.emit(world, rapidspinScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), scale: scale, wind: wind, intensity: Math.max(0.5, Math.min(2, power / 50)) }, 22);
            });
            NativeEffects.boost(world, actor, "spe", haste);
            WorldFeedback.emit(world, rapidspinScene, 1, centre,
                { moment: "spin", actor: String(actor.ref()), radius: radius, scale: scale, rings: rings, wind: wind,
                    freed: freed, haste: haste, intensity: Math.max(0.6, Math.min(2, power / 50 + freed * 0.12)) }, 30);
            world.sound("minecraft:entity.player.attack.sweep", centre, 18, "{}");
            if (freed > 0) {
                WorldFeedback.emit(world, rapidspinScene, 1, centre, { moment: "free", actor: String(actor.ref()), freed: freed, scale: scale, rings: rings }, 26);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), rapidspinFreeText, [freed], 28);
            }
            WorldFeedback.emit(world, rapidspinScene, 1, centre.plus(WorldCombat.point(0, 1.0, 0)),
                { moment: "haste", actor: String(actor.ref()), haste: haste, scale: scale }, 24);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)),
                hits > 0 ? rapidspinHitText : rapidspinHasteText, hits > 0 ? [hits] : [haste], 26);
            done(action);
        }
    });
}
