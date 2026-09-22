/**
 * 变圆 / defensecurl — 执行组织。
 *
 * 核心念头：把自己缩成一颗滚圆的球。球一成形，防御提高；挨打时球顺势滚开一段，
 *   把冲过来的力卸成一次位移——你不是被撞得踉跄，你是滚走了。
 *
 * 两幕：
 *   缩（windup 播「缩球」，提交前只观察与预告，打断不花代价）。
 *   滚（提交后）：NativeEffects.boostWindow 写入公共能力阶梯，挂上共享身份
 *     world_combat:status/defensecurl 的卷球窗口；窗口内每次被敌对来源打中，按「滚向」把身体
 *     沿对手方向或反向推开一小段（带滚动间隔，多段攻击不会每一下都滚）。
 * 结束：窗口到期或被清除时，记下窗口 id 的记号一并结束，等级随窗口一起收回，播放展开。
 */
namespace PokemonSkills {
    const defenseCurlScene = "world_combat:move_defensecurl";
    const defenseCurlBall = "world_combat:defensecurl_ball";
    const defenseCurlMark = "world_combat:defensecurl_mark";
    const defenseCurlCurlText = "world_combat.move.defensecurl.text.curl";
    const defenseCurlUncurlText = "world_combat.move.defensecurl.text.uncurl";
    /** 表现里的参考半径：`data.scale = 实际球半径 / 这个数`，让球与判定同径。 */
    const defenseCurlReferenceRadius = 0.8;
    /** 滚动间隔：同一只精灵两次滚动之间的最短间隔，避免多段攻击把人反复推走。 */
    const defenseCurlLast: { [ref: string]: number } = Object.create(null);

    // 记号：只记这次卷球窗口的 id；窗口结束时按 id 提前结束它（已自然到期则无事发生）。
    WorldCombat.effect(defenseCurlMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.window !== "number" || !isFinite(value.window)) throw new Error("Invalid defense curl mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(defenseCurlMark, "start", function () { });

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function defenseCurlStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 事件处理器里没有动作，用本招身份构造一份求值上下文；非宝可梦退回设计默认值。 */
    function defenseCurlContext(world: CombatWorld, actor: CombatActor): any {
        return { skill: skills["defensecurl"], world: world, actor: actor, detail: { values: skills["defensecurl"].defaults } };
    }
    function defenseCurlConfig(world: CombatWorld, actor: CombatActor): any {
        try { return config(world, actor, "defensecurl"); } catch (error) { return skills["defensecurl"].defaults; }
    }

    /** 挨打时滚开：球把冲力卸成位移，方向由配置「滚向」决定。 */
    function defenseCurlRoll(event: CombatWorldEvent, victim: CombatActor): void {
        const world = event.world();
        if (!world.valid(victim)) return;
        const attacker = event.actor();
        if (attacker === null || String(attacker.ref()) === String(victim.ref())) return;
        if (world.friendly(attacker)) return;
        const body = world.observe(victim), source = world.observe(attacker);
        if (body === null || source === null) return;
        const now = world.tick(), key = String(victim.ref());
        const context = defenseCurlContext(world, victim);
        if (now < (defenseCurlLast[key] || 0)) return;
        const gap = Math.max(6, Math.round(p("defensecurl", "rollGap", context)));
        defenseCurlLast[key] = now + gap;
        const distance = Math.max(0.4, p("defensecurl", "roll", context));
        const toward = source.position().minus(body.position());
        if (toward.length() < 0.05) return;
        const settings = defenseCurlConfig(world, victim);
        const counter = Number(settings && settings.counter) === 1;
        const direction = counter ? toward.unit() : toward.unit().scale(-1);
        const moved = world.displace(victim, direction.scale(distance));
        const spin = Math.max(8, Math.round(p("defensecurl", "spin", context)));
        WorldFeedback.emit(world, defenseCurlScene, 1, body.position(),
            { moment: "roll", actor: key, roll: Math.round(moved * 100) / 100, spin: spin, counter: counter ? 1 : 0,
                direction: [direction.x(), direction.y(), direction.z()],
                intensity: Math.max(0.7, Math.min(2, moved / 1.4 + spin / 48)) }, 22);
        world.sound("minecraft:entity.armadillo.roll", body.position(), 12, "{}");
    }
    MobEffects.react("world_combat:move_defensecurl/roll", defenseCurlBall, "world_combat:damage_applied",
        function (event) { return event.target(); },
        function (event, actor, _state) { defenseCurlRoll(event, actor); });

    define({
        id: "defensecurl",
        name: "变圆",
        description: "将身体蜷曲变圆，从而提高自己的防御。",
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
            const beforeDef = defenseCurlStage(world, actor, "def");
            const windowId = NativeEffects.boostWindow(world, actor, { def: gift }, window, "defensecurl");
            const levels = Math.max(0, defenseCurlStage(world, actor, "def") - beforeDef);
            MobEffects.apply(world, actor, defenseCurlBall, window, levels);
            world.effect(defenseCurlMark, actor, JSON.stringify({ window: windowId }), window);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, defenseCurlScene, 1, feet,
                { moment: "curl", actor: String(actor.ref()), gift: levels, ball: ball, spin: spin, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, spin / 32)) }, 28);
            WorldFeedback.keep(world, "defensecurl:ball:" + String(actor.ref()), defenseCurlScene, 1, body.position(),
                { moment: "ball", actor: String(actor.ref()), ball: ball, scale: scale }, Math.min(window, 200));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), defenseCurlCurlText,
                [levels, Math.round(window / 20)], 30);
            world.sound("minecraft:entity.armadillo.roll", body.position(), 14, "{}");
            done(action);
        }
    });

    // 卷球窗口到期或被清除：结束记下的卷球窗口，它只收回自己那一份等级。
    WorldCombat.on("world_combat:move_defensecurl/uncurl", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== defenseCurlBall) return;
        const world = event.world(), actor = event.actor();
        delete defenseCurlLast[String(actor.ref())];
        if (!world.valid(actor)) return;
        const marks = world.effects(actor, defenseCurlMark);
        if (marks.length) {
            const mark = JSON.parse(String(marks[0].data()));
            if (typeof mark.window === "number") NativeEffects.windowClose(world, mark.window);
            world.operation(marks[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, defenseCurlScene, 1, body.position(), { moment: "uncurl", actor: String(actor.ref()) }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), defenseCurlUncurlText, [], 20);
        world.sound("minecraft:entity.armadillo.unroll_finish", body.position(), 12, "{}");
    });
}
