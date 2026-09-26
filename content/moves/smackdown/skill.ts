/**
 * 击落 / smackdown 的出手方式。
 *
 * 核心念头：朝一个目标投出一支系着配重的岩弹。石头本身不重，重的是那一截配重——砸中一个离地在空的
 * 对手，就持续用向下的原生受击冲量把它拽回地面，落地那刻才算压成；同一记先申请一段「被钉住」的部分
 * 拘束身份，让它无法再起飞。已经站在地上的目标只挨这一记石头，配重只用来钉住会飞的它。
 * 它是这一族「垂直轴」里的**远程防空**位：威力最低、射程最远，价值全在“把会飞的东西按回地面”。
 *
 * 三幕：
 *   起（windup，提交前）：只观察与预告，可免费打断，不花 PP。
 *   飞（flight → hit/miss）：自由瞄准投出岩弹，撞墙或首碰决定结局；命中活体结算一记，离地在空的目标
 *       被申请部分拘束身份并开始真实下坠。
 *   落（fall → land）：下坠压力逐刻读目标真实高度与 grounded，只加有限的向下冲量，落地那一刻才扬尘。
 *
 * 自由瞄准：`kind: "aim"`——可点实体，也可点空中/地面落点；提交不要求存在敌人。打空、目标离场、
 *   目标被地形挡下都只走受击或落空，不凭空结算原目标。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（impact → PokemonDamage）、位移（world.hitImpulse）
 * 与状态（真实的 MC MobEffect，身份 world_combat:status/smackdown）都走同一条路；只有“飞行属性/浮空特性”
 * 是宝可梦层。
 */
namespace PokemonSkills {
    const smackdownScene = "world_combat:move_smackdown";
    const smackdownPin = "world_combat:smackdown_pin";
    const smackdownFall = "world_combat:smackdown_fall";
    const smackdownHitText = "world_combat.move.smackdown.text.hit";
    const smackdownDropText = "world_combat.move.smackdown.text.drop";
    const smackdownMissText = "world_combat.move.smackdown.text.miss";

    /** 目标是否被托离地面：贴地观察、共享浮空身份，或宝可梦层的飞行属性/浮空特性。 */
    function smackdownAirborne(world: CombatWorld, actor: CombatActor): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        if (!body.grounded()) return true;
        if (CombatStatus.has(world, actor, "fly") || CombatStatus.has(world, actor, "magnetrise") || CombatStatus.has(world, actor, "telekinesis")) return true;
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
            if (NativeEffects.types(pokemon, state).indexOf("flying") >= 0) return true;
            if (String(NativeEffects.ability(pokemon, state)).indexOf("levitate") >= 0) return true;
        }
        return false;
    }

    /** 拔掉目标身上的浮空身份；返回是否拔掉了任何一样。清除权限由原生 removeMobEffect 判定。 */
    function smackdownStrip(world: CombatWorld, actor: CombatActor): boolean {
        let removed = false;
        ["fly", "magnetrise", "telekinesis"].forEach(function (name) {
            CombatStatus.tagged(world, actor, name).forEach(function (effect) {
                if (world.removeMobEffect(actor, effect.id(), effect.key())) removed = true;
            });
        });
        return removed;
    }

    /** 在真实受击者上下文里求值本招参数：pull／pinTicks 依赖被砸中的那只，而不是瞄准时选中的。 */
    function smackdownVictimContext(action: CombatAction, victim: CombatActor): FactContext {
        return withTarget(factContext(action), victim);
    }

    // 真实下坠过程：跨过施放动作，用独立托管效果驱动；所有权随目标与拘束身份结束。
    WorldCombat.effect(smackdownFall, 1, 300, "actor", function (json) {
        const value = JSON.parse(json);
        ["fall", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid smackdown fall");
        });
        if (value.refused === undefined) value.refused = 0;
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(smackdownFall, "start", function (effect) {
        const world = effect.world(), victim = effect.target();
        const body = world.valid(victim) ? world.observe(victim) : null;
        if (body === null) { effect.end(); return; }
        effect.schedule("fall", "fall", 1, "{}");
    });
    WorldCombat.effectHandler(smackdownFall, "fall", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        // 拘束身份被清除（牛奶／/effect clear／驱散）后，下坠压力随之结束，不残留。
        if (!world.valid(victim) || !CombatStatus.has(world, victim, "smackdown")) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        if (!body.grounded()) {
            // 只把竖直速度补到目标下坠速度，不覆盖水平原生运动；抗推/无敌/权限由原生入口判定。
            const delta = -data.fall - body.velocity().y();
            if (delta < -0.02) {
                if (world.hitImpulse(victim, WorldCombat.point(0, Math.max(-4, delta), 0))) {
                    data.refused = 0;
                    WorldFeedback.onEffect(world, effect.id(), "smackdown:drag", smackdownScene, 1, body.position(),
                        { moment: "drag", target: String(victim.ref()), fall: data.fall, drops: Math.round(18 + data.fall * 20), scale: data.scale });
                } else {
                    // 原生抗推/权限连续拒绝就不再空耗，免疫控制的 Boss 只受主伤。
                    data.refused = (data.refused || 0) + 1;
                    effect.state(JSON.stringify(data));
                    if (data.refused >= 4) { effect.end(); return; }
                }
            }
            effect.state(JSON.stringify(data));
            smackdownStrip(world, victim);
            effect.schedule("fall", "fall", 1, "{}");
            return;
        }
        // 真实落地：只有观察到 grounded 才播落地尘环与文字。
        WorldFeedback.onEffect(world, effect.id(), "smackdown:land", smackdownScene, 1, body.position(),
            { moment: "land", target: String(victim.ref()), scale: data.scale });
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), smackdownDropText, [], 24);
        world.sound("minecraft:block.anvil.land", body.position(), 12, "{}");
        effect.remaining(20);
    });
    WorldCombat.effectHandler(smackdownFall, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "smackdown",
        name: "Smack Down",
        description: "朝一个目标投出系着配重的岩弹：砸中离地/会飞的对手就持续用向下的原生受击冲量把它拽回地面、拔掉浮空身份并钉住一段；站在地上的普通对手只挨这一记石头。可点实体，也可点空中的落点。",
        uses: ["把飞在空中的对手打落地面", "打断对手的飞扑与浮空", "远距离先手砸一下"],
        kind: "aim",
        range: 12,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "rock",
        maximumTicks: 160,
        defaults: { ai: { maxChase: 14, flyersOnly: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("smackdown", "collisionRadius", pokemon), geometry: "line", style: "rock", color: 0x9A8A72,
                label: read(config, ["ai", "flyersOnly"]) === true ? "只打空中的" : "击落" };
        },
        windup: function (action, config) {
            action.present("smackdown:windup", smackdownScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", flyersOnly: read(config, ["ai", "flyersOnly"]) === true }));
            return p("smackdown", "prepare", action);
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const origin = action.origin();
            const aimPoint = action.targetPosition();
            const speed = Math.max(0.3, p("smackdown", "throwSpeed", action));
            const radius = Math.max(0.15, p("smackdown", "collisionRadius", action));
            const appearance: any = { item: "minecraft:cobblestone", scale: Math.max(0.35, Math.min(0.8, radius * 1.6)), spin: true };
            if (target !== null) appearance.homing = { target: String(target.ref()), turn: 5, delay: 2, range: action.range() + 2 };
            let settled = false, impacted = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function miss(current: CombatAction, hit: CombatImpact | null): void {
                const scope = current.world();
                const at = hit !== null && hit.blockPosition() !== null ? hit.blockPosition()! : hit !== null ? hit.position() : aimPoint;
                WorldFeedback.emit(scope, smackdownScene, 1, at, { moment: "miss", face: hit !== null ? hit.blockFace() : "" }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.6, 0)), smackdownMissText, [], 20);
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range() + 3, radius: radius, lifetime: 120, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    impacted = true;
                    const scope = current.world(), victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { miss(current, hit); finish(current); return; }
                    const context = smackdownVictimContext(current, victim);
                    const power = p("smackdown", "impact", context);
                    if (!impact(current, hit, "smackdown", power, { damage: damageSpec("smackdown", "impact") })) { finish(current); return; }
                    const facts = scope.observe(victim);
                    const airborne = facts !== null && smackdownAirborne(scope, victim);
                    const aloft = facts !== null && !facts.grounded();
                    WorldFeedback.emit(scope, smackdownScene, 1, hit.position(),
                        { moment: "hit", target: String(victim.ref()), airborne: airborne ? 1 : 0, aloft: aloft ? 1 : 0,
                            intensity: Math.max(0.5, Math.min(1.8, power / 50)), power: power, count: Math.round(24 + power * 0.45) }, 24);
                    sound(current, "cobblemon:move.rockthrow.target");
                    sound(current, "cobblemon:impact.rock");
                    if (airborne) {
                        const pull = Math.max(0.2, p("smackdown", "pull", context));
                        const pinTicks = Math.max(20, Math.round(p("smackdown", "pinTicks", context)));
                        const scale = Math.max(0.6, Math.min(2, pull / 0.8));
                        // 先申请正常的部分拘束身份；被拒（免疫/权限）就只留主伤，不谎报控制。
                        const pinned = CombatStatus.apply(scope, victim, "partiallytrapped", smackdownPin, pinTicks, 0);
                        if (pinned && aloft) {
                            scope.effect(smackdownFall, victim, JSON.stringify({ fall: pull, scale: scale, refused: 0 }), 300);
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.0, 0)), smackdownDropText, [], 26);
                        } else {
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.0, 0)), smackdownHitText, [], 24);
                        }
                    } else {
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.0, 0)), smackdownHitText, [], 24);
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!impacted) { miss(current, null); finish(current); }
            });
            WorldFeedback.keep(world, "smackdown:bolt:" + action.id(), smackdownScene, 1, origin,
                { moment: "flight", projectile: flight, scale: Math.max(0.5, Math.min(1.6, radius / 0.32)) }, 120);
        }
    });

    // 贴地身份存续期：每 10 刻把目标身上新出现的浮空身份再拔掉一次（清除权限仍由 removeMobEffect 判定），
    // 让它无法重新起飞；这里不再叠加任何强制位移，免控 Boss 只受允许的主伤。低密度画面续期。
    WorldCombat.on("world_combat:move_smackdown/pin", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== smackdownPin) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 10 !== 0) return;
        smackdownStrip(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "smackdown:pin:" + String(actor.ref()), smackdownScene, 1, body.position(),
            { moment: "pin", target: String(actor.ref()) }, 20);
    });
}
