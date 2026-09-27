/**
 * 变圆 / defensecurl — 执行组织。
 *
 * 核心念头：把自己缩成一颗滚圆的球。球一成形，防御提高；挨到真实的直接攻击时，球顺着一股劲在地上滚开一小段，
 *   把冲过来的力卸成位移——你不是被撞得踉跄，你是滚走了。
 *
 * 两幕：
 *   缩（windup 播「缩球」，提交前只观察与预告，打断不花代价）。
 *   滚（提交后）：NativeEffects.boostWindow 把公共能力阶梯写进「球」这个载体（MobEffect）本身，
 *     窗口与画面都随载体存在；窗口内每次被敌对**直接攻击**命中，按水平受击方向分 2–4 刻实际扫体滚动，
 *     碰墙就收住；同一只精灵两次滚动之间有最短间隔，多段攻击不会每一下都把人滚飞。
 * 结束：载体到期或被清除时，窗口的等级贡献由其载体自动收回，本招只负责收尾画面与限流记号。
 */
namespace PokemonSkills {
    const defenseCurlScene = "world_combat:move_defensecurl";
    const defenseCurlBall = "world_combat:defensecurl_ball";
    const defenseCurlMark = "world_combat:defensecurl_mark";
    const defenseCurlRoll = "world_combat:defensecurl_roll";
    const defenseCurlCurlText = "world_combat.move.defensecurl.text.curl";
    const defenseCurlUncurlText = "world_combat.move.defensecurl.text.uncurl";
    /** 表现里的参考半径：`data.scale = 实际球半径 / 这个数`，让球与判定同径。 */
    const defenseCurlReferenceRadius = 0.8;
    /** 滚动间隔：同一只精灵两次滚动之间的最短间隔，避免多段攻击把人反复推走。 */
    const defenseCurlLast: { [ref: string]: number } = Object.create(null);

    // 球画面：绑在真实球载体上（按 anchor 对照），重施替换、净化/到期即停。
    WorldCombat.effect(defenseCurlMark, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json);
        if (!MobEffects.validAnchor(value.anchor)) throw new Error("Invalid defense curl mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(defenseCurlMark, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.anchor)) { effect.end(); return; }
        const body = world.observe(actor); if (body === null) return;
        WorldFeedback.onEffect(world, effect.id(), "defensecurl:ball:" + String(actor.ref()), defenseCurlScene, 1, body.position(),
            { moment: "ball", actor: String(actor.ref()), ball: state.ball, scale: state.scale, spin: state.spin, gift: state.gift });
    });
    WorldCombat.effectHandler(defenseCurlMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 滚：挨打后的一段真实短滚，逐刻推进、碰墙即停；画面按每刻真实子段绘制。
    WorldCombat.effect(defenseCurlRoll, 1, 60, "actor", function (json) {
        const value = JSON.parse(json);
        if (!Array.isArray(value.dir) || value.dir.length !== 3 || !isFinite(value.step) || value.step <= 0
            || !isFinite(value.remaining) || value.remaining < 0) throw new Error("Invalid defense curl roll");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(defenseCurlRoll, "start", function (effect) { defenseCurlStep(effect); });
    WorldCombat.effectHandler(defenseCurlRoll, "step", function (effect) { defenseCurlStep(effect); });
    WorldCombat.effectHandler(defenseCurlRoll, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function defenseCurlStep(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        const state = JSON.parse(effect.state()), body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        const step = Math.min(state.step, state.remaining);
        if (!(step > 0.001)) { effect.end(); return; }
        const direction = WorldCombat.point(state.dir[0], state.dir[1], state.dir[2]);
        const from = body.position(), to = from.plus(direction.scale(step));
        const wall = WorldGeometry.blockHit(world, from, to);
        const moved = world.displace(actor, direction.scale(step));
        const after = world.observe(actor), at = after === null ? from : after.position();
        state.remaining = Math.max(0, state.remaining - moved);
        state.travelled = (state.travelled || 0) + moved;
        WorldFeedback.emit(world, defenseCurlScene, 1, at,
            { moment: "roll", target: String(actor.ref()), direction: [direction.x(), direction.y(), direction.z()],
                roll: Math.round(state.travelled * 100) / 100, path: [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]],
                spin: state.spin, intensity: state.intensity }, 12);
        if (wall !== null || moved < step - 0.02 || state.remaining <= 0.05) { effect.end(); return; }
        effect.state(JSON.stringify(state));
        effect.schedule("step", "step", 1, "{}");
    }

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function defenseCurlStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 受击时按持有者的现场与偏好求值；其他生物使用参数的设计默认值。 */
    function defenseCurlValue(world: CombatWorld, actor: CombatActor, key: string): number {
        return String(actor.domain()) === "cobblemon"
            ? p("defensecurl", key, { world, actor })
            : actionParameters.entries("defensecurl")[key].value;
    }
    function defenseCurlConfig(world: CombatWorld, actor: CombatActor): any {
        try { return config(world, actor, "defensecurl"); } catch (error) { return skills["defensecurl"].defaults; }
    }

    /** 挨打时滚开：只认真实的敌对直接攻击，按水平受击方向起一段短滚。 */
    function defenseCurlRollBack(event: CombatWorldEvent, victim: CombatActor): void {
        const world = event.world();
        if (!world.valid(victim)) return;
        const data = JSON.parse(String(event.data()));
        // 直接攻击（近战/原生弹体/已结算的攻击招）才算；DoT、脚本余伤与无类别变化招不触发。
        if (!DamageSemantics.directOffense(data)) return;
        const attacker = event.actor();
        if (attacker === null || String(attacker.ref()) === String(victim.ref())) return;
        if (world.allied(victim, attacker)) return;
        const body = world.observe(victim), source = world.observe(attacker);
        if (body === null || source === null) return;
        const now = world.tick(), key = String(victim.ref());
        if (now < (defenseCurlLast[key] || 0)) return;
        const gap = Math.max(6, Math.round(defenseCurlValue(world, victim, "rollGap")));
        defenseCurlLast[key] = now + gap;
        const distance = Math.max(0.4, defenseCurlValue(world, victim, "roll"));
        const toward = source.position().minus(body.position());
        const heading = WorldCombat.point(toward.x(), 0, toward.z());
        if (heading.length() < 0.05) return;
        const settings = defenseCurlConfig(world, victim);
        const counter = Number(settings && settings.counter) === 1;
        const direction = (counter ? heading : heading.scale(-1)).unit();
        const spin = Math.max(8, Math.round(defenseCurlValue(world, victim, "spin")));
        const ticks = Math.max(2, Math.min(4, Math.round(distance / 0.5)));
        const started = world.effect(defenseCurlRoll, victim,
            JSON.stringify({ dir: [direction.x(), direction.y(), direction.z()], step: distance / ticks, remaining: distance,
                spin: spin, intensity: Math.max(0.7, Math.min(2, distance / 1.4 + spin / 48)), travelled: 0 }), ticks + 2);
        if (started > 0) world.sound("minecraft:entity.armadillo.roll", body.position(), 12, "{}");
    }
    MobEffects.react("world_combat:move_defensecurl/roll", defenseCurlBall, "world_combat:damage_applied",
        function (event) { return event.target(); },
        function (event, actor, _state) { defenseCurlRollBack(event, actor); });

    define({
        id: "defensecurl",
        cooldownParameter: "wait",
        name: "变圆",
        description: "提高防御，受击时向设定方向滚开一段距离。",
        uses: ["被近身缠住时卷成球，被打就顺势滚开换身位", "贴着对手时反撞回去，用滚劲切进它的怀里", "用便宜的一段窗口把防御抬起来再打"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 90,
        style: "tuck",
        stationary: true,
        defaults: { counter: 0, ai: { maxChase: 10, panic: 0.6, close: 3 } },
        fields: [
            field(pathOf("counter"), "滚向", "choice", {
                options: [
                    { value: 0, label: "顺势滚开" },
                    { value: 1, label: "反撞回去" }
                ],
                help: "顺势滚开：挨打就朝远离对手的方向滚，换掉身位、拉开距离；反撞回去：挨打反而朝对手滚过去，贴进它的怀里续压。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("defensecurl", "ball", pokemon), geometry: "area", style: "tuck", color: 0xD9B382,
                label: config && Number(config.counter) === 1 ? "变圆 · 反撞" : "变圆 · 顺势" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["defensecurl"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("defensecurl", "tempo", context)),
                recover: Math.round(p("defensecurl", "aftercast", context)),
                cooldown: Math.round(p("defensecurl", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_defensecurl:tuck", defenseCurlScene, 1, action.origin(),
                JSON.stringify({ moment: "tuck", counter: config && Number(config.counter) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(1, Math.round(p("defensecurl", "gift", action))));
            const window = Math.max(60, Math.round(p("defensecurl", "window", action)));
            const ball = Math.max(0.4, p("defensecurl", "ball", action));
            const spin = Math.max(8, Math.round(p("defensecurl", "spin", action)));
            const scale = ball / defenseCurlReferenceRadius;
            const before = defenseCurlStage(world, actor, "def");
            // 重施先替换旧球画面；新载体会让旧窗口随旧 anchor 一并失效，不叠第二份。
            world.effects(actor, defenseCurlMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            const carrier = MobEffects.apply(world, actor, defenseCurlBall, window, gift);
            const windowId = carrier ? NativeEffects.boostWindow(world, actor, { def: gift }, window, "defensecurl", carrier) : 0;
            const levels = Math.max(0, defenseCurlStage(world, actor, "def") - before);
            if (carrier === null || !windowId || levels <= 0) {
                // 已封顶或窗口被拒：不留下没有贡献的空球，也不虚报等级。
                if (carrier !== null) MobEffects.consume(world, actor, defenseCurlBall);
                done(action);
                return;
            }
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            world.effect(defenseCurlMark, actor,
                JSON.stringify({ anchor: MobEffects.anchor(carrier), ball: ball, scale: scale, spin: spin, gift: levels }), carrier.duration());
            WorldFeedback.emit(world, defenseCurlScene, 1, feet,
                { moment: "curl", actor: String(actor.ref()), gift: levels, ball: ball, spin: spin, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, spin / 32)) }, 28);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), defenseCurlCurlText,
                [levels, Math.round(carrier.duration() / 20)], 30);
            world.sound("minecraft:entity.armadillo.roll", body.position(), 14, "{}");
            done(action);
        }
    });

    // 球到期或被清除：清限流记号与滚动作，收起画面。等级贡献随球载体自动收回。
    WorldCombat.on("world_combat:move_defensecurl/uncurl", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== defenseCurlBall) return;
        const world = event.world(), actor = event.actor();
        delete defenseCurlLast[String(actor.ref())];
        if (!world.valid(actor)) return;
        world.effects(actor, defenseCurlMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        world.effects(actor, defenseCurlRoll).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        // 被重施替换不算结束：新球仍在，收尾留给新窗口。
        if (MobEffects.read(world, actor, defenseCurlBall) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, defenseCurlScene, 1, body.position(), { moment: "uncurl", actor: String(actor.ref()) }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), defenseCurlUncurlText, [], 20);
        world.sound("minecraft:entity.armadillo.unroll_finish", body.position(), 12, "{}");
    });
}
