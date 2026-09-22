/**
 * 念力 / confusion —— 注册与动作。
 *
 * 核心念头：一发又快又便宜的念弹。眉间聚起一点紫光 → 念弹贴着地面直线窜出去 → 命中处炸开一圈扭曲的
 * 紫环，偶尔把挨到的人搅得恍惚；被念力缠住的人每次想反打都会被当场再敲一下。
 *
 * 两幕：
 *   起（windup，提交前）：眉间紫光向内收拢，只播预告。
 *   击（flight → hit/burst，提交后）：念弹沿直线飞出；命中活体结算一次 pulse 伤害，按 confuseChance
 *       掷一次恍惚（本单元自己的共享身份载体 world_combat:status/confusion）。
 *
 * 恍惚行为（本单元自己的变体）：目标每次想出手都掷一次失手（概率存在载体振幅里）；被打散时念力再敲
 * 一下——按目标自身特攻放大的一点最大生命伤害，并把恍惚续上。这是念力「越挣扎越被磨」的读法。
 */
namespace PokemonSkills {
    /** 被打散时念力再敲一下的基础值；按目标自身特攻放大。skill.ts 与说明同源。 */
    const confusionChipBase = 0.012;
    const confusionChipPerSpecialAttack = 0.00012;
    /** 被敲一下后恍惚至少再续这么多刻，保证「越挣扎越被缠」。 */
    const confusionRefresh = 60;

    /** 只有代表载体就是本单元的 id 时，本单元的门禁才接管。 */
    function confusionCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === confusionEffect ? effect : null;
    }

    /** 把恍惚挂到目标身上：借共享身份 confusion，振幅存失手概率百分数，独一无二地替换同类载体。 */
    function confusionDaze(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", confusionEffect, ticks, fumblePct, { unique: true })) return false;
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, confusionScene, 1, at, { moment: "daze", target: String(victim.ref()), fumble: fumblePct }, 24);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), confusionDazeText, [], 28);
        return true;
    }

    define({
        id: confusionId,
        name: "Confusion",
        description: "向对手发射一道微弱的念力：念弹贴地直线窜出，命中造成特殊伤害，并可能把目标搅得恍惚。恍惚期间目标出手会失手，每次失手还会被念力再敲一下。",
        uses: ["便宜快速的远程骚扰", "用低伤害反复磨血", "压制喜欢连续出手的对手"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 16,
        style: "psychic",
        defaults: { focus: false, ai: { maxChase: 15, fresh: true, finish: true } },
        fields: [flag("focus", "凝念")],
        indicator: function (config, pokemon) {
            return { radius: p(confusionId, "radius", pokemon) * 2.2, geometry: "line", style: "psychic", color: 0xB15CE0,
                label: config && config.focus === true ? "念力·凝念" : "念力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[confusionId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(confusionId, "tempo", context)),
                recover: Math.round(p(confusionId, "aftercast", context)),
                cooldown: Math.round(p(confusionId, "recharge", context)),
                active: 0,
                range: p(confusionId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:confusion:windup", confusionScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(confusionId, "pulse", action);
            const speed = p(confusionId, "velocity", action);
            const radius = p(confusionId, "radius", action);
            const chance = Math.max(0.02, Math.min(0.9, p(confusionId, "confuseChance", action)));
            const daze = Math.max(40, Math.round(p(confusionId, "dazeTicks", action)));
            const fumblePct = Math.round(Math.max(0.05, Math.min(0.9, p(confusionId, "fumble", action))) * 100);
            const motes = Math.max(8, Math.round(p(confusionId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.3));
            const intensity = Math.max(0.5, Math.min(2.2, power / 52));
            let impacted = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.confusion.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/psychic/psyswirl", tint: 0xB15CE0, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.28))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 120,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    impacted = true;
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, confusionId, power, { damage: damageSpec(confusionId, "pulse") });
                        WorldFeedback.emit(scope, confusionScene, 1, point,
                            { moment: "hit", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity }, 24);
                        if (landed && scope.random() < chance) confusionDaze(scope, victim, point, daze, fumblePct);
                    }
                    WorldFeedback.emit(scope, confusionScene, 1, point,
                        { moment: "burst", target: victim !== null ? String(victim.ref()) : "", motes: motes, scale: scale, intensity: intensity }, 26);
                    sound(current, "cobblemon:impact.psychic");
                    finish(current);
                }
            }, function (current: CombatAction) { finish(current); });
            WorldFeedback.keep(world, "confusion:trail:" + action.id(), confusionScene, 1, origin,
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity }, 60);
        }
    });

    // 失手反应：共享门禁掷中后出手作废；这里把念力再敲一下、恍惚续上（本单元的失败反应）。
    WorldCombat.on("world_combat:move_confusion/fumble", "world_combat:action_rejected", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.reason) !== "confused" && String(data.details && data.details.status) !== "confusion") return;
        const world = event.world(), actor = event.actor();
        // Match the exact carrier named in the rejection so stacked confusion sources cannot double-punish.
        const carrier = data.details && data.details.effect !== undefined ? String(data.details.effect) : "";
        if (carrier && carrier !== confusionEffect) return;
        const effect = confusionCarrier(world, actor);
        if (effect === null) return;
        const body = world.observe(actor);
        if (body !== null) {
            const facts = PokemonDamage.combatants.read(world, actor);
            const specialAttack = facts.stats.spa || 0;
            const fraction = Math.max(0.012, Math.min(0.05, confusionChipBase + specialAttack * confusionChipPerSpecialAttack));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                const remaining = Math.max(0, effect.duration());
                CombatStatus.apply(world, actor, "confusion", confusionEffect, Math.max(confusionRefresh, remaining), effect.amplifier(), { unique: true });
                WorldFeedback.emit(world, confusionScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), confusionChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    });

    // 恍惚存续期：低密度的飞鸟与紫点每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_confusion/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== confusionEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "confusion:daze:" + String(actor.ref()), confusionScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
