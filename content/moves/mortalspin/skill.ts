/**
 * 晶光转转 / mortalspin 的出手方式。
 *
 * 核心念头：旋身甩出一圈带毒的晶光。身体一转，缠在身上的束缚被甩脱，随后朝四周甩出有限几枚真实毒晶，
 *   晶与晶之间留着缝隙；每枚晶碰到一个敌人就结算一次毒系接触伤害并让它中毒，方块会挡住对应的晶。
 *
 * 三幕（提交前只播预告）：
 *   起（wind，提交前）：毒晶在脚边聚起，只播一记预告。
 *   旋（free → spin → crystal → hit）：提交后立即甩脱身上的 rooted 世界效果与共享身份 partiallytrapped／
 *       trapped／leechseed，再朝全周撒出 `crystals` 枚真实毒晶；每枚最多命中一个敌人、每个敌人本轮最多挨
 *       一次，命中处顶开 `push` 并上 `toxin` 时长的毒；剧毒式上剧毒（掉血更快），晶光式上普通毒。
 *   散（settle）。
 *
 * 与同族分开：高速旋转同样脱缚，但它是把自己变快；晶光转转是把毒晶撒成一圈短飞晶——不形成持久毒地、也不提速。
 *   束缚与毒都是共享机制（CombatStatus 身份、world_combat:rooted），对宝可梦、原版生物、其他模组生物和玩家一视同仁。
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
        description: "旋身甩出一圈带毒的晶光：先把缠在身上的绑紧、紧束、寄生种子这类束缚甩脱，再朝四周甩出有限几枚真实毒晶，每枚碰到一个敌人各结算一次并让它中毒，晶与晶之间留有可躲的缝隙、方块会挡住对应的晶。剧毒式上剧毒、留得更久。",
        uses: ["被绑紧、紧束或寄生种子缠住时脱身", "被围住时把毒晶撒成一圈、给沾到的人上毒", "用毒把一场缠斗慢慢磨赢"],
        kind: "self",
        range: 2.6,
        maxRange: 4.8,
        prepare: 7,
        active: 8,
        recover: 6,
        cooldown: 30,
        maximumTicks: 160,
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
            const crystals = Math.max(6, Math.round(p("mortalspin", "crystals", action)));
            const cap = Math.max(1, Math.round(p("mortalspin", "maxTargets", action)));
            const scale = radius / 2.6;
            const identity = virulent ? "toxic" : "poison";
            const freed = mortalspinSlip(world, actor);
            const crystalRadius = Math.max(0.24, Math.min(0.5, body.width() * 0.35));
            const speed = Math.max(0.35, Math.min(0.8, radius / 6));
            const lifetime = Math.max(14, Math.ceil(radius / speed) + 8);
            const scenes = WorldFeedback.actionScenes(mortalspinScene);
            // self 施放时 target 是自身；AI 与玩家给的瞄准点从 targetPosition 读。有明确方向时让一枚毒晶正对它，
            // 保证全周散射仍能压住选定的目标；没有方向（纯空放）就整圈随机起角。
            const aimed = action.targetPosition();
            const aimDelta = WorldCombat.point(aimed.x() - centre.x(), 0, aimed.z() - centre.z());
            const ringBase = aimDelta.length() > 0.4 ? Math.atan2(aimDelta.z(), aimDelta.x()) : world.random() * Math.PI * 2;
            const hitRefs: { [ref: string]: boolean } = Object.create(null);
            let remaining = crystals, hits = 0, poisoned = 0, settled = false;

            sound(action, "cobblemon:move.poisonpowder.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, mortalspinScene, 1, centre,
                    { moment: "settle", actor: String(actor.ref()), scale: scale, scatter: scatter, rings: rings }, 20);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.5, 0)),
                    hits > 0 ? (poisoned > 0 ? mortalspinToxicText : mortalspinHitText) : mortalspinHitText,
                    hits > 0 ? [hits, poisoned] : [0, 0], 26);
                scenes.finish(current, done);
            }

            function release(current: CombatAction): void {
                remaining--;
                if (remaining <= 0) finish(current);
            }

            // 解缚先结算，随后才撒晶。
            if (freed > 0) {
                WorldFeedback.emit(world, mortalspinScene, 1, centre, { moment: "free", actor: String(actor.ref()), freed: freed, scale: scale, rings: rings }, 26);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), mortalspinFreeText, [freed], 28);
            }
            WorldFeedback.emit(world, mortalspinScene, 1, centre,
                { moment: "spin", actor: String(actor.ref()), radius: radius, scale: scale, rings: rings, scatter: scatter,
                    crystals: crystals, toxic: virulent ? 1 : 0, freed: freed, intensity: Math.max(0.6, Math.min(2, power / 34 + freed * 0.12)) }, 30);
            world.sound("cobblemon:move.poisongas.target", centre, 16, "{}");

            function launch(current: CombatAction, index: number): void {
                const angle = ringBase + index * (Math.PI * 2 / crystals);
                const direction = WorldCombat.point(Math.cos(angle), 0, Math.sin(angle)).unit();
                const key = "crystal:" + index;
                const origin = current.origin().plus(direction.scale(crystalRadius + 0.1));
                let resolved = false;
                const flight = current.projectile(origin, direction.scale(speed), 0, crystalRadius, radius, lifetime,
                    function (inner: CombatAction, hit: CombatImpact): void {
                        if (resolved) return;
                        resolved = true;
                        scenes.stop(inner, key);
                        const scope = inner.world(), at = hit.position(), victim = hit.target();
                        const touched = victim !== null && scope.valid(victim);
                        const enemy = touched && !scope.friendly(victim!);
                        if (enemy && !hitRefs[String(victim!.ref())] && hits < cap) {
                            const landed = impact(inner, hit, "mortalspin", power, { damage: damageSpec("mortalspin", "spin"), contact: true });
                            if (landed) {
                                hitRefs[String(victim!.ref())] = true;
                                hits++;
                                if (CombatStatus.inflict(scope, victim!, identity, toxin, undefined, { secondary: true })) poisoned++;
                                const away = WorldCombat.point(at.x() - centre.x(), 0, at.z() - centre.z());
                                if (scope.valid(victim!) && away.length() > 0.2) scope.hitDisplace(victim!, away.unit().scale(push));
                            }
                        }
                        WorldFeedback.emit(scope, mortalspinScene, 1, at,
                            { moment: touched ? "hit" : "block", target: touched ? String(victim!.ref()) : "", scale: scale,
                                scatter: scatter, toxic: virulent ? 1 : 0, intensity: Math.max(0.5, Math.min(2, power / 34)) }, 22);
                    },
                    function (inner: CombatAction): void {
                        if (!resolved) { resolved = true; scenes.stop(inner, key); }
                        release(inner);
                    },
                    JSON.stringify({ sprite: "cobblemon:particle/generic/spike", tint: 0xB06AD0, glow: true, spin: true,
                        scale: Math.max(0.6, Math.min(1.2, crystalRadius / 0.3)) }));
                scenes.show(current, key, origin,
                    { moment: "crystal", projectile: flight, direction: [direction.x(), 0, direction.z()], scatter: scatter,
                        scale: scale, toxic: virulent ? 1 : 0, intensity: Math.max(0.5, Math.min(2, power / 34)) });
            }

            for (let index = 0; index < crystals; index++) launch(action, index);
        }
    });
}
