/**
 * 萤火 / tailglow 的出手方式。
 *
 * 核心念头：一次凝神入定。萤火似的光点从尾灯一颗颗亮起、在身周缓缓明灭；使用者盯着那团光出神，
 * 越亮越静，几拍之后光点一齐灭掉，精神落定，特攻猛涨。它是这一族里唯一只抬一项、却抬到 +3 的招，
 * 也是唯一把自己的心神押在一层**会被打散的光**上——窗口里挨一记结实攻击，光就散了。
 *
 * 三幕：
 *   起式（windup，提交前）：光点从四周向尾灯收拢、由暗到亮；可被打断，打断不消耗任何东西。
 *   凝神（提交后）：特攻立刻 +gift，挂上共享身份 world_combat:status/tailglow 的凝神窗口；这段等级是
 *     「凝神状态」这条真实载体拥有的临时窗口（NativeEffects.boostWindow），只撤本招这一份，不会在到期时
 *     误扣别处等级。随后几拍亮起只是装饰收势，不再决定等级。
 *   落定（收势）：光点一齐灭掉、浮出结果；窗口走完自然淡去，或被打散时提前收回特攻。
 *
 * 与同族分开：蝶舞原地扬鳞三项各 +1、诡计要有个算计对象只 +2；萤火是**只 +3、没有对象、纯靠自己的光**，
 * 且光被打散就前功尽弃。
 */
namespace PokemonSkills {
    const tailglowScene = "world_combat:move_tailglow";
    const tailglowFocus = "world_combat:tailglow_focus";
    const tailglowLight = "world_combat:tailglow_light";
    const tailglowFocusText = "world_combat.move.tailglow.text.focused";
    const tailglowFadeText = "world_combat.move.tailglow.text.faded";
    const tailglowBreakText = "world_combat.move.tailglow.text.scattered";
    /** 表现里的参考半径：`data.scale = 实际光环半径 / 这个数`。 */
    const tailglowReference = 1.0;

    /** 尾灯定位：背对真实朝向、按体型取一个明确的背后点；光点挂在这里而不是身体中心。 */
    function tailglowTail(body: CombatObservation, actor: CombatActor, world: CombatWorld): CombatPoint {
        const facing = WorldGeometry.facing(world, actor);
        const heading = facing === null ? WorldCombat.point(0, 0, 1) : WorldGeometry.flatUnit(facing, WorldCombat.point(0, 0, 1));
        const reach = 0.4 + body.width() * 0.5, centre = body.position();
        return WorldCombat.point(centre.x() - heading.x() * reach, centre.y() - body.height() * 0.12, centre.z() - heading.z() * reach);
    }

    // 持续尾灯：一条托管效果认领这次凝神窗口，按自己的钟每 10 刻把灯重新贴到真实尾部；载体（凝神状态）
    // 被清除或到期时窗口结束，灯随效果一起收，不留残影。状态维持与视觉归属都是同一条真实载体。
    WorldCombat.effect(tailglowLight, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid tailglow light carrier");
        return JSON.stringify({ carrier: value.carrier });
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(tailglowLight, "start", function (effect) { effect.schedule("glow", "glow", 1, "{}"); });
    WorldCombat.effectHandler(tailglowLight, "glow", function (effect) {
        const world = effect.world(), actor = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, data.carrier)) { effect.end(); return; }
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        const glow = Math.max(0.4, 0.55 + body.height() * 0.35);
        WorldFeedback.onEffect(world, effect.id(), "tail-light", tailglowScene, 1, tailglowTail(body, actor, world),
            { moment: "hover", actor: String(actor.ref()), motes: 12, glow: glow, drift: 0.05, scale: glow / tailglowReference });
        effect.schedule("glow", "glow", 10, "{}");
    });
    WorldCombat.effectHandler(tailglowLight, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "tailglow",
        cooldownParameter: "wait",
        name: "萤火",
        description: "凝出一圈缓缓明灭的萤光盯着出神，巨幅提高自己的特攻；这段凝神是一层可见的光，窗口里挨到一记结实的攻击就会被打散、特攻提前收回。静心让光更耐打、撑得更久，代价是起手与冷却更长。",
        uses: ["开战前先凝一记，把特攻拉到最高", "在对手够不到时入定，赶在接战前落定", "被追急了先凝神反打，赌对手来不及打散"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 5,
        cooldown: 96,
        style: "glow",
        stationary: true,
        defaults: { steady: false, ai: { maxChase: 18, safeGap: 10 } },
        fields: [flag("steady", "静心")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(0.8, p("tailglow", "glow", pokemon) + 0.4), geometry: "area", style: "glow", color: 0xD9E85A,
                label: config && config.steady ? "萤火 · 静心" : "萤火" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["tailglow"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("tailglow", "tempo", context)),
                recover: Math.round(p("tailglow", "aftercast", context)),
                cooldown: Math.round(p("tailglow", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            const at = body === null ? action.origin() : tailglowTail(body, actor, world);
            action.present("world_combat:move_tailglow:gather", tailglowScene, 1, at,
                JSON.stringify({ moment: "gather", steady: config && config.steady ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(3, Math.round(p("tailglow", "gift", action))));
            const beats = Math.max(2, Math.min(4, Math.round(p("tailglow", "beats", action))));
            const motes = Math.max(12, Math.round(p("tailglow", "motes", action)));
            const glow = Math.max(0.4, p("tailglow", "glow", action));
            const drift = Math.max(0.02, p("tailglow", "drift", action));
            const span = Math.max(80, Math.round(p("tailglow", "span", action)));
            const beat = Math.max(3, Math.round(p("tailglow", "beat", action)));
            const scale = glow / tailglowReference;
            const perBeat = Math.max(4, Math.round(motes / beats));
            const tail = tailglowTail(body, actor, world);

            // 收益在准备结束（提交这一刻）一次给出：这次凝神抬起的特攻挂成载体拥有的临时窗口，只撤本招这一份。
            // 旧的同招窗口先收，重施不会在同一份等级上叠加或偷走别处等级。
            const existing = MobEffects.read(world, actor, tailglowFocus);
            if (existing !== null) world.removeMobEffect(actor, tailglowFocus, existing.key());
            const carrier = MobEffects.apply(world, actor, tailglowFocus, span, 0);
            if (carrier === null) { done(action); return; }
            const before = NativeEffects.effectiveStage(world, actor, "spa");
            const window = NativeEffects.boostWindow(world, actor, { spa: gift }, span, "world_combat:move/tailglow", carrier);
            const gained = Math.max(0, Math.round(NativeEffects.effectiveStage(world, actor, "spa") - before));
            if (window === 0) { world.removeMobEffect(actor, tailglowFocus, carrier.key()); done(action); return; }
            world.effect(tailglowLight, actor, JSON.stringify({ carrier: MobEffects.anchor(carrier) }), span);

            WorldFeedback.emit(world, tailglowScene, 1, tail,
                { moment: "kindle", actor: String(actor.ref()), gift: gained, motes: motes, glow: glow, drift: drift,
                    scale: scale, beats: beats, intensity: Math.max(0.8, Math.min(2.2, gained / 2 + motes / 90)) }, 30);
            WorldFeedback.text(world, tail.plus(WorldCombat.point(0, 0.6, 0)), tailglowFocusText, [gained], 30);
            world.sound("minecraft:block.amethyst_block.chime", tail, 14, "{}");

            // 若干拍亮起只是装饰收势：收益已经给出，这里只把光点一拍一拍点完就落定。
            let index = 0, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function settle(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here !== null) WorldFeedback.emit(scope, tailglowScene, 1, tailglowTail(here, actor, scope),
                    { moment: "settle", actor: String(actor.ref()), motes: motes, glow: glow, scale: scale }, 18);
                finish(current);
            }
            function pulseNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const at = tailglowTail(here, actor, scope);
                WorldFeedback.emit(scope, tailglowScene, 1, at,
                    { moment: "pulse", actor: String(actor.ref()), index: index + 1, beats: beats, motes: perBeat,
                        glow: glow, drift: drift, scale: scale, intensity: Math.max(0.6, Math.min(2, perBeat / 14)) }, 18);
                scope.sound(index === 0 ? "minecraft:block.amethyst_block.resonate" : "minecraft:block.amethyst_block.chime",
                    at, 12, "{}");
                index++;
                if (index >= beats) { current.after(Math.min(4, beat), settle); return; }
                current.after(beat, pulseNow);
            }
            pulseNow(action);
        }
    });

    // 窗口里挨到一记结实的攻击：光被打散，提前收回特攻。小擦碰（低于走神阈值）不走神。
    WorldCombat.on("world_combat:move_tailglow/break", "world_combat:damage_applied", "", function (event) {
        const target = event.target(), world = event.world();
        if (target === null || !world.valid(target)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (MobEffects.read(world, target, tailglowFocus) === null) return;
        const body = world.observe(target);
        if (body === null) return;
        const threshold = p("tailglow", "poise", <any>{ world: world, actor: target });
        if (data.actual < body.maxHealth() * threshold) return;
        MobEffects.consume(world, target, tailglowFocus);
    });

    // 凝神窗口走完或被清除：这次凝神抬起的特攻由载体拥有的窗口随载体一起收回，这里只播散去／被打散那一幕。
    WorldCombat.on("world_combat:move_tailglow/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tailglowFocus) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const broken = String(data.cause) === "removed";
        const tail = tailglowTail(body, actor, world);
        WorldFeedback.emit(world, tailglowScene, 1, tail,
            { moment: broken ? "scatter" : "fade", actor: String(actor.ref()) }, 22);
        WorldFeedback.text(world, tail.plus(WorldCombat.point(0, 0.6, 0)),
            broken ? tailglowBreakText : tailglowFadeText, [], 22);
    });
}
