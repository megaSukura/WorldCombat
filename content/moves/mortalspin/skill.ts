/**
 * 晶光转转 / mortalspin 的出手方式。
 *
 * 核心念头：旋身甩出一圈带毒的晶光。身体一转，缠在身上的束缚被甩脱，毒晶贴着地面荡开，周围的人一起沾上毒。
 *
 * 三幕（提交前只播预告）：
 *   起（wind，提交前）：毒晶在脚边聚起，只播一记预告。
 *   旋（spin → hit）：提交后原地旋 `rings` 圈——先甩脱身上的 rooted 世界效果与共享身份 partiallytrapped／
 *       trapped／leechseed，再以自身 `radius` 为半径扫一圈，圈内每个敌人各挨一记毒系接触伤害、被顶开 `push`，
 *       并各上 `toxin` 时长的毒；剧毒式上剧毒（掉血更快），晶光式上普通毒。
 *   散（settle）。
 *
 * 与同族分开：高速旋转同样脱缚，但它是把自己变快；晶光转转是把毒甩到周围。束缚与毒都是共享机制
 *   （CombatStatus 身份、world_combat:rooted），对宝可梦、原版生物、其他模组生物和玩家一视同仁。
 *
 * 配置 `virulent` 由公式改威力／半径／毒时长与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const mortalspinScene = "world_combat:move_mortalspin";
    const mortalspinFreeText = "world_combat.move.mortalspin.text.free";
    const mortalspinHitText = "world_combat.move.mortalspin.text.hit";
    const mortalspinToxicText = "world_combat.move.mortalspin.text.toxic";

    /** 甩脱缠在身上的东西：rooted 世界效果与共享身份 partiallytrapped／trapped／leechseed；返回甩掉的条数。 */
    function mortalspinSlip(world: CombatWorld, actor: CombatActor): number {
        let freed = 0;
        const roots = world.effects(actor, "world_combat:rooted");
        for (let index = 0; index < roots.length; index++) if (world.operation(roots[index].id(), "world_combat:dispel", "{}")) freed++;
        if (CombatStatus.cure(world, actor, "partiallytrapped")) freed++;
        if (CombatStatus.cure(world, actor, "trapped")) freed++;
        if (CombatStatus.cure(world, actor, "leechseed")) freed++;
        return freed;
    }

    define({
        id: "mortalspin",
        cooldownParameter: "recharge",
        name: "Mortal Spin",
        description: "旋身甩出一圈带毒的晶光：先把缠在身上的绑紧、紧束、寄生种子这类束缚甩脱，再扫开身周一圈的敌人、把它们顶开并让它们中毒。剧毒式上剧毒、留得更久，晶光式扫得更开。",
        uses: ["被绑紧、紧束或寄生种子缠住时脱身", "被围住时一次给一圈人上毒", "用毒把一场缠斗慢慢磨赢"],
        kind: "self",
        range: 2.6,
        maxRange: 4.8,
        prepare: 7,
        active: 8,
        recover: 6,
        cooldown: 30,
        style: "toxicspin",
        stationary: true,
        defaults: { virulent: false, ai: { maxChase: 8, cluster: true } },
        fields: [flag("virulent", "剧毒式")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("mortalspin", "radius", pokemon) : 2.6, geometry: "area", style: "toxicspin", color: 0xB06AD0,
                label: config && config.virulent === true ? "晶光转转·剧毒" : "晶光转转·晶光" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["mortalspin"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("mortalspin", "tempo", context)),
                recover: Math.round(p("mortalspin", "recover", context)),
                cooldown: Math.round(p("mortalspin", "recharge", context)),
                active: 8,
                range: p("mortalspin", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_mortalspin:gather", mortalspinScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", virulent: config && config.virulent === true ? 1 : 0,
                    scatter: Math.round(p("mortalspin", "scatter", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const virulent = !!(config && config.virulent === true);
            const centre = body.position();
            const radius = Math.max(1.5, p("mortalspin", "radius", action));
            const power = p("mortalspin", "spin", action);
            const rings = Math.max(2, Math.round(p("mortalspin", "rings", action)));
            const push = p("mortalspin", "push", action);
            const toxin = Math.max(80, Math.round(p("mortalspin", "toxin", action)));
            const scatter = Math.max(8, Math.round(p("mortalspin", "scatter", action)));
            const cap = Math.max(1, Math.round(p("mortalspin", "maxTargets", action)));
            const scale = radius / 2.6;
            const identity = virulent ? "toxic" : "poison";
            const freed = mortalspinSlip(world, actor);
            let hits = 0, poisoned = 0;

            sound(action, "cobblemon:move.poisonpowder.actor");
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0.3, radius, { below: 2, above: 2 }), function (enemy, facts) {
                if (hits >= cap || String(enemy.ref()) === String(actor.ref())) return;
                if (!hurt(action, enemy, "mortalspin", power, { damage: damageSpec("mortalspin", "spin"), contact: true })) return;
                hits++;
                if (world.valid(enemy) && CombatStatus.inflict(world, enemy, identity, toxin, undefined, { secondary: true })) poisoned++;
                const away = facts.position().minus(centre);
                if (world.valid(enemy) && away.length() > 0.2)
                    world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                WorldFeedback.emit(world, mortalspinScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), scale: scale, scatter: scatter,
                        toxic: virulent ? 1 : 0, intensity: Math.max(0.5, Math.min(2, power / 34)) }, 22);
            });
            WorldFeedback.emit(world, mortalspinScene, 1, centre,
                { moment: "spin", actor: String(actor.ref()), radius: radius, scale: scale, rings: rings, scatter: scatter,
                    toxic: virulent ? 1 : 0, freed: freed, intensity: Math.max(0.6, Math.min(2, power / 34 + freed * 0.12)) }, 30);
            world.sound("cobblemon:move.poisongas.target", centre, 16, "{}");
            if (freed > 0) {
                WorldFeedback.emit(world, mortalspinScene, 1, centre, { moment: "free", actor: String(actor.ref()), freed: freed, scale: scale, rings: rings }, 26);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), mortalspinFreeText, [freed], 28);
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)),
                hits > 0 ? (poisoned > 0 ? mortalspinToxicText : mortalspinHitText) : mortalspinHitText,
                hits > 0 ? [hits, poisoned] : [0, 0], 26);
            done(action);
        }
    });
}
