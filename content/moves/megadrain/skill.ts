/**
 * 超级吸取 / megadrain 的出手方式。
 *
 * 核心念头：把一颗孢荚弹出去，撞在对手身上绽成一张吸盘根网，勾住它，再一股股把养分拉回来——
 * 本族里唯一**把东西送出去**的吸招：先看见孢荚飞过去，才看见养分回来。
 *
 * 两幕：
 *   起（windup，提交前）：身前养起一颗青绿孢荚，只播预告。
 *   飞（fly，提交后）：孢荚沿瞄准方向抛出，命中活体后在落点绽开（`burst`），结算第一口 `pod` 伤害，
 *       随后按 `pulses` 追抽若干拍，每拍沿「目标→自身」抽出一束汁流；打空则在尽头散掉。
 *   缠（sap）：每拍都在目标身上画一次根网与回流，拍数由 `data.waves` 读出。
 *
 * 与同族分开：吸取是藤不脱手的一啄、终极吸取从地里拱出大根三拍连抽、木角用身体撞；
 * 只有超级吸取先抛出一颗看得见的孢荚，落点由飞行决定。
 *
 * 命中、防御、相性与暴击走共享 `impact`／`hurt`；回复走共享伤害载荷的 `drain`，对所有战斗者同一条路。
 */
namespace PokemonSkills {
    const megaDrainScene = "world_combat:move_megadrain";
    const megaDrainHitText = "world_combat.move.megadrain.text.hit";
    const megaDrainSapText = "world_combat.move.megadrain.text.sap";
    const megaDrainMissText = "world_combat.move.megadrain.text.miss";

    define({
        id: "megadrain",
        cooldownParameter: "recharge",
        name: "Mega Drain",
        description: "A nutrient-draining attack. The user's HP is restored by up to half the damage taken by the target.",
        uses: ["从一段距离外抛荚勾住对手", "用连续几拍把伤害和回血一起抽上来", "对拉不开距离的目标持续续航"],
        kind: "enemy",
        range: 8.5,
        maxRange: 12.0,
        prepare: 8,
        active: 1,
        recover: 8,
        cooldown: 34,
        style: "grass",
        defaults: { burst: false, ai: { maxChase: 12, healBelow: 0.9 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("megadrain", "reach", pokemon), geometry: "line", style: "grass", color: 0x8CC63F,
                label: config && config.burst === true ? "超级吸取·爆荚" : "超级吸取" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["megadrain"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("megadrain", "tempo", context)),
                recover: Math.round(p("megadrain", "aftercast", context)),
                cooldown: Math.round(p("megadrain", "recharge", context)),
                active: 1,
                range: p("megadrain", "reach", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:megadrain:" + action.id(), megaDrainScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", burst: config && config.burst === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("megadrain", "pod", action);
            const share = p("megadrain", "sap", action);
            const speed = p("megadrain", "seed", action);
            const latch = p("megadrain", "latch", action);
            const waves = Math.max(1, Math.min(3, Math.round(p("megadrain", "pulses", action))));
            const interval = Math.max(4, Math.round(p("megadrain", "interval", action)));
            const motes = Math.max(10, Math.round(power * 0.4 + share * 44));
            const scale = latch / 0.5;
            let settled = false, struck = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 追抽一拍：`dealt` 是已经结算过的拍数，本次是第 `dealt + 1` 拍。 */
            function wave(current: CombatAction, ref: string, dealt: number): void {
                const scope = current.world();
                const live = ref === "" ? null : scope.actor(ref);
                if (live === null || !scope.valid(live)) { finish(current); return; }
                const body = scope.observe(live);
                const at = body === null ? current.targetPosition() : body.position();
                const self = scope.observe(current.actor());
                const from = self === null ? current.origin() : self.position();
                const landed = hurt(current, live, "megadrain", power,
                    { damage: damageSpec("megadrain", "pod"), drain: share });
                const flow = from.minus(at), span = flow.length();
                const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : flow.unit();
                WorldFeedback.emit(scope, megaDrainScene, 1, at,
                    { moment: "sap", path: ["target", "source"], target: ref,
                        direction: [inward.x(), inward.y(), inward.z()], span: span,
                        motes: motes, wave: dealt + 1, waves: waves }, 26);
                if (landed) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), megaDrainSapText, [dealt + 1], 20);
                if (dealt + 1 >= waves) { finish(current); return; }
                current.after(interval, function (next: CombatAction) { wave(next, ref, dealt + 1); });
            }

            WorldFeedback.emit(world, megaDrainScene, 1, action.origin(),
                { moment: "windup", scale: scale, motes: motes, burst: config && config.burst === true ? 1 : 0 }, 16);
            sound(action, "cobblemon:move.megadrain.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed,
                range: action.range(),
                radius: 0.28,
                appearance: { sprite: "cobblemon:generic/grass/seed", tint: 0x9BD24B, glow: true, scale: 1.0 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const target = hit.target();
                    const at = hit.position();
                    if (struck) return;
                    if (target === null || !scope.valid(target) || scope.friendly(target)) {
                        WorldFeedback.emit(scope, megaDrainScene, 1, at, { moment: "fizzle", scale: scale, motes: motes }, 18);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), megaDrainMissText, [], 20);
                        finish(current);
                        return;
                    }
                    struck = true;
                    const landed = impact(current, hit, "megadrain", power,
                        { damage: damageSpec("megadrain", "pod"), drain: share });
                    WorldFeedback.emit(scope, megaDrainScene, 1, at,
                        { moment: "burst", path: ["target", "source"], target: String(target.ref()),
                            scale: scale, motes: motes, waves: waves, wave: 1 }, 24);
                    sound(current, "cobblemon:move.megadrain.target");
                    if (!landed) { finish(current); return; }
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), megaDrainHitText, [], 22);
                    if (waves > 1) wave(current, String(target.ref()), 1);
                    else finish(current);
                }
            }, function (current: CombatAction) {
                if (struck) return;
                WorldFeedback.emit(current.world(), megaDrainScene, 1, current.targetPosition(),
                    { moment: "miss", scale: scale, motes: motes }, 18);
                WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.9, 0)),
                    megaDrainMissText, [], 20);
                finish(current);
            });
            WorldFeedback.emit(world, megaDrainScene, 1, action.origin(),
                { moment: "fly", projectile: flight, scale: scale, motes: motes }, 60);
        }
    });
}
