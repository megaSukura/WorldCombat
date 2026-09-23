/**
 * 幻象光线 / psybeam —— 注册与动作。
 *
 * 核心念头：一道**会拐弯去追人的幻影射线**。眼神一凝，紫光从瞳里射出去，不走路直线，而是贴着掩体拐进目标
 * 怀里；被追上的人眼前浮出幻影，可能恍惚。它只有一条，但会追、会穿。
 *
 * 两幕：
 *   起（windup，提交前）：瞳里把幻影收成一点紫光，只播预告。
 *   追（flight → hit，提交后）：紫光带转向追向目标；命中结算 ray 伤害，按 confuseChance 掷恍惚
 *       （本单元自己的共享身份载体 world_combat:status/confusion）。回响状态下紫光穿透第一个目标继续追第二个。
 *
 * 恍惚行为（本单元自己的变体）：目标每次想出手都可能被打散；被打散时幻影再叠一层——把恍惚续到至少
 * 剩余时长或 refresh，越挣扎越难挣脱。这是幻象光线与念力（被打散时挨一下）分开的地方。
 */
namespace PokemonSkills {
    /** 被打散时幻影至少把恍惚续到这么多刻，保证「越挣扎越被缠」。 */
    const psybeamRefresh = 60;

    /** 只有代表载体就是本单元的 id 时，本单元的门禁才接管。 */
    function psybeamCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === psybeamEffect ? effect : null;
    }

    /** 把恍惚挂到目标身上：借共享身份 confusion，振幅存失手概率百分数，独一无二地替换同类载体。 */
    function psybeamDaze(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", psybeamEffect, ticks, fumblePct, { unique: true })) return false;
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, psybeamScene, 1, at, { moment: "confuse", target: String(victim.ref()), fumble: fumblePct }, 24);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.25, 0)), psybeamDazeText, [], 28);
        return true;
    }

    define({
        id: psybeamId,
        cooldownParameter: "recharge",
        name: "Psybeam",
        description: "射出一道会追人的幻影射线：紫光带转向追向目标，命中造成特殊伤害，并可能把目标搅得恍惚；恍惚期间目标出手会失手。回响状态下紫光会穿透第一个目标继续追下一个。",
        uses: ["中距离点名，绕开掩体追人", "压制喜欢横移躲弹的对手", "用回响一次穿到两个目标"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 22,
        style: "psychic",
        defaults: { echo: false, ai: { maxChase: 16, fresh: true, line: false } },
        fields: [flag("echo", "回响")],
        indicator: function (config, pokemon) {
            return { radius: p(psybeamId, "radius", pokemon) * 2.2, geometry: "line", style: "psychic", color: 0xB15CE0,
                label: config && config.echo === true ? "幻象光线·回响" : "幻象光线·单影" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psybeamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psybeamId, "tempo", context)),
                recover: Math.round(p(psybeamId, "aftercast", context)),
                cooldown: Math.round(p(psybeamId, "recharge", context)),
                active: 0,
                range: p(psybeamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:psybeam:windup", psybeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", echo: config && config.echo === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(psybeamId, "ray", action);
            const speed = p(psybeamId, "velocity", action);
            const radius = p(psybeamId, "radius", action);
            const turn = p(psybeamId, "turn", action);
            const chance = Math.max(0.02, Math.min(0.9, p(psybeamId, "confuseChance", action)));
            const daze = Math.max(40, Math.round(p(psybeamId, "dazeTicks", action)));
            const fumblePct = Math.round(Math.max(0.05, Math.min(0.9, p(psybeamId, "fumble", action))) * 100);
            const motes = Math.max(10, Math.round(p(psybeamId, "motes", action)));
            const echo = !!(config && config.echo === true);
            const target = action.target();
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.3));
            const intensity = Math.max(0.5, Math.min(2.2, power / 56));
            let impacted = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.confusion.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/psychic/psyswirl", tint: 0xB15CE0, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.28)),
                pierce: echo ? 1 : 0,
                homing: { target: target === null ? "" : String(target.ref()), turn: turn, delay: 2, range: action.range() + 4 }
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 160,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    impacted = true;
                    WorldFeedback.emit(scope, psybeamScene, 1, point,
                        { moment: "hit", target: victim !== null ? String(victim.ref()) : "", motes: motes, scale: scale, intensity: intensity }, 24);
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, psybeamId, power, { damage: damageSpec(psybeamId, "ray") });
                        if (landed && scope.valid(victim) && scope.random() < chance) psybeamDaze(scope, victim, point, daze, fumblePct);
                        sound(current, "cobblemon:impact.psychic");
                    }
                    // 穿透状态下由 complete 收势，让紫光继续追下一个；单影命中即由 complete 结束。
                }
            }, function (current: CombatAction) {
                const scope = current.world();
                if (!impacted) {
                    WorldFeedback.emit(scope, psybeamScene, 1, current.targetPosition(), { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 1.1, 0)), psybeamMissText, [], 20);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "psybeam:trail:" + action.id(), psybeamScene, 1, origin,
                { moment: "flight", projectile: flight, motes: motes, scale: scale, intensity: intensity, echo: echo ? 1 : 0 }, 60);
        }
    });


    // 恍惚存续期：低密度的飞鸟与紫环每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_psybeam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== psybeamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "psybeam:trance:" + String(actor.ref()), psybeamScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
