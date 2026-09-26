/**
 * 盐腌 / saltcure 的出手方式。
 *
 * 核心念头：抓一把粗盐摔在对手身上——命中那一下是物理伤害，之后盐粒嵌进皮肉，每隔一段蛰掉一口；
 *   钢/水（以及世界里湿透或披着金属甲）的身体更痛。盐壳一直留在身上，直到时间走完或被清掉。
 *
 * 两幕 + 收：
 *   起：提交前 windup 在掌心聚起盐霜（action.present）。
 *   击：提交后盐块飞出；命中活体结算一次物理伤害，挂上共享身份 world_combat:status/saltcure
 *      （本单元效果），并以目标为宿主起一个绑定效果 world_combat:saltcure_bind。
 *   收：绑定效果按 interval 蛰一口（brineShare × 目标最大生命 × 脆弱系数）；盐壳被牛奶/别的招式
 *      清掉或时间走完，绑定随之结束。
 * 反制：盐块有飞行时间、会被掩体挡下；盐壳本身不阻止目标移动，只能靠清状态或速战速决。
 * 配置 brine（浓卤）：每口更狠、间隔更密，但盐壳更短、冷却更长。
 */
namespace PokemonSkills {
    const saltcureCrustText = "world_combat.move.saltcure.text.crust";
    const saltcureFizzleText = "world_combat.move.saltcure.text.fizzle";

    /** 钢/水属性，或世界里湿透、披着金属甲的身体：盐渍更痛，蛰痛系数翻倍。 */
    function saltcureBrittle(world: CombatWorld, target: CombatActor): boolean {
        const body = world.observe(target);
        if (body !== null && body.wet()) return true;
        const types = PokemonDamage.combatants.read(world, target).types;
        if (types.indexOf("steel") >= 0 || types.indexOf("water") >= 0) return true;
        const worn = world.equipment(target);
        for (let i = 0; i < worn.length; i++) {
            const item = String(worn[i].item());
            if (item.indexOf("iron") >= 0 || item.indexOf("chainmail") >= 0
                || item.indexOf("netherite") >= 0 || item.indexOf("copper") >= 0) return true;
        }
        return false;
    }

    function saltcureBindData(json: string): string {
        const value = JSON.parse(json);
        ["interval", "share", "left"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid saltcure bind");
        });
        if (value.interval < 1 || value.share <= 0 || value.left < 0) throw new Error("Invalid saltcure bind");
        return JSON.stringify(value);
    }

    WorldCombat.effect(saltcureBind, 1, 1200, "actor", saltcureBindData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(saltcureBind, "start", function (effect) {
        const data = JSON.parse(effect.state());
        data.lease = MobEffects.bind(effect.world(), effect.target(), saltcureEffect); effect.state(JSON.stringify(data));
        effect.schedule("watch", "watch", 1, "{}");
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(saltcureBind, "watch", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null || !MobEffects.present(world, JSON.parse(effect.state()).lease)) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "crust", saltcureScene, 1, body.position(), { moment: "linger", target: String(target.ref()) });
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(saltcureBind, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const brittle = saltcureBrittle(world, victim);
        const amount = Math.max(1, Math.floor(body.maxHealth() * data.share * (brittle ? saltcureBrittleFactor : 1)));
        PokemonDamage.residual(world, victim, "saltcure", amount, { brittle: brittle, share: data.share });
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        else effect.end();
    });
    WorldCombat.effectHandler(saltcureBind, "operation:world_combat:dispel", function (effect) { effect.end(); });
    PokemonDamage.onDamageApplied("world_combat:saltcure/residual", receipt => {
        const fact = WorldFeedback.receipt(receipt.event);
        if (fact === null || !(fact.actual > 0)) return;
        const world = receipt.world, at = fact.point, data = receipt.data;
        WorldFeedback.emit(world, saltcureScene, 1, at, { moment: data.brittle ? "brittle" : "brine", target: String(receipt.target.ref()),
            intensity: Math.max(.6, Math.min(2.2, data.share * 12)), share: data.share, brittle: data.brittle ? 1 : 0 }, 20);
        world.sound("minecraft:block.calcite.hit", at, 14, "{}");
    }, { move: "saltcure", segment: "residual" });

    define({
        id: "saltcure",
        cooldownParameter: "wait",
        name: "盐腌",
        description: "把一身粗盐摔在对手身上：命中造成物理伤害，之后盐壳每隔一段按目标最大生命蛰掉一口；钢或水属性（以及湿透、披着金属甲的）身体更痛。",
        uses: ["磨掉高生命的肉盾", "对钢系与水系加倍惩罚", "逼对手分心去清状态"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 60,
        style: "salt",
        defaults: { brine: false, ai: { maxChase: 12, brittle: true, leaveStation: true } },
        fields: [flag("brine", "浓卤")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["saltcure"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.round(p("saltcure", "tempo", context)),
                recover: p("saltcure", "recover", context),
                cooldown: Math.round(p("saltcure", "wait", context)),
                active: 1,
                range: p("saltcure", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("saltcure:windup", saltcureScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", brine: config && config.brine ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: 6, geometry: "line", style: "salt", label: config && config.brine ? "盐腌·浓卤" : "盐腌" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.4, p("saltcure", "saltSpeed", action));
            const radius = Math.max(0.15, p("saltcure", "collision", action));
            const power = p("saltcure", "crust", action);
            const share = Math.max(0.03, p("saltcure", "brineShare", action));
            const ticks = Math.max(60, Math.round(p("saltcure", "saltTicks", action)));
            const interval = Math.max(10, Math.round(p("saltcure", "interval", action)));
            sound(action, "cobblemon:move.rockthrow.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 80,
                appearance: { sprite: "cobblemon:particle/generic/earth", tint: 0xF2EFE4, scale: 0.8 },
                impact: function (current, hit) {
                    const scope = current.world();
                    const struck = hit.target();
                    if (struck === null || !scope.valid(struck)) {
                        WorldFeedback.emit(scope, saltcureScene, 1, hit.position(), { moment: "fizzle" }, 20);
                        WorldFeedback.text(scope, hit.position(), saltcureFizzleText, [], 24);
                        sound(current, "minecraft:block.sand.break");
                        return;
                    }
                    const point = hit.position();
                    if (!impact(current, hit, "saltcure", power, { damage: damageSpec("saltcure", "crust") })) return;
                    if (MobEffects.apply(scope, struck, saltcureEffect, ticks, 0) === null) return;
                    const existing = scope.effects(struck, saltcureBind);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    const left = Math.max(1, Math.floor(ticks / interval));
                    scope.effect(saltcureBind, struck, JSON.stringify({ interval: interval, share: share, left: left }), ticks);
                    const brittle = saltcureBrittle(scope, struck);
                    WorldFeedback.emit(scope, saltcureScene, 1, point,
                        { moment: "crust", target: String(struck.ref()), brittle: brittle ? 1 : 0, share: share,
                            intensity: Math.max(0.6, Math.min(2.2, share * 12)) }, 30);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), saltcureCrustText, [], 28);
                    sound(current, "cobblemon:move.rockthrow.target");
                }
            }, function (current) {
                done(current);
            });
            WorldFeedback.emit(world, saltcureScene, 1, action.origin(),
                { moment: "throw", projectile: flight, target: action.target() ? String(action.target()!.ref()) : "" }, 40);
        }
    });
}
