/**
 * 回声 / echoedvoice 的出手方式。
 *
 * 核心念头：唱出一声会荡在空气里的回响。声音落在传声半径之内，像一圈还没散尽的涟漪；只要附近的回声
 *   还在，下一个人（谁都可以，包括自己）接唱时就踩着那一层往上叠——接得越多，这一嗓子越重、声环越多。
 *
 * 两幕：
 *   起（inhale，提交前）：吸一口气、声点在喉头聚成环，只播预告。
 *   唱（release → impact／miss）：提交后声音**瞬时**落向目标，没有需要时间穿行的声速；命中就按当前层数
 *       结算一次声音伤害，在目标身上炸开 `layer` 圈声环；没命中就在尽头散掉。这一唱同时把回声留在自己身上
 *       （共享身份 world_combat:status/echoed_voice，振幅 = 层数−1），供下一个人接着叠。
 * 层数：能接上的层数由附近回声**发声者自身**的传播距决定（parameter 的 audible），界面、AI 与接唱同源。
 * 余韵：真实回声载体上挂一条托管标记，用稀疏的定数图形显示还剩几层、临近结束淡出；标记随回声身份一起消失。
 *
 * 与同族分开：
 *   轮唱（round）是把一句歌的余韵传给**同伴**、只在接住时翻一次倍；
 *   回声（本招）是**谁都能接**、每次接都把层数往上加（1..5），一圈还在场上荡着的声环就是它的身份；
 *   一个像传球，一个像叠浪。
 */
namespace PokemonSkills {
    /** 回声载体上的层数余韵：一条托管标记，随回声身份同寿；图形由 custom scene 逐帧画固定数量。 */
    const echoMark = "world_combat:move_echoedvoice/layers";
    const echoMarkKey = "world_combat:move_echoedvoice/layers";
    const echoLayerScene = "world_combat:move_echoedvoice_layers";
    WorldCombat.effect(echoMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["layer", "start", "duration"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid echo layer state");
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(echoMark, "start", function (effect) {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        WorldFeedback.onEffect(world, effect.id(), echoMarkKey, echoLayerScene, 1, body.position(),
            { moment: "layers", actor: String(target.ref()), layer: state.layer, total: 5, duration: state.duration, start: state.start });
    });
    WorldCombat.effectHandler(echoMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 回声身份被牛奶/驱散提前拿掉时，立刻撤掉余韵，不留下失效锚。
    WorldCombat.on("world_combat:move_echoedvoice/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== echoEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, echoMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: echoId,
        cooldownParameter: "recharge",
        name: "Echoed Voice",
        description: "唱出一声会留在场上的回响：点名一个目标造成声音伤害，同时把这一层回声留在自己身上；附近的回声还没散时，谁接唱都能从那一层往上叠，威力 = 基础 × 层数（1~5）。声音不被掩体阻挡，接得越密越重。",
        uses: ["唱出一声会留在场上的回响", "接住附近的回声继续叠高", "用声音无视掩体点名一个目标"],
        kind: "enemy",
        range: 6.5,
        maxRange: 7.5,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "sound",
        defaults: { crescendo: false, ai: { maxChase: 9, sustainEcho: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(echoId, "reach", pokemon) : 6.5, geometry: "line", style: "sound",
                color: 0x8FD8FF, label: config && config.crescendo === true ? "回声·渐强" : "回声" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[echoId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(echoId, "tempo", context)),
                recover: Math.round(p(echoId, "settle", context)),
                cooldown: Math.round(p(echoId, "recharge", context)),
                active: 0,
                range: p(echoId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const layer = world.valid(actor) ? echoedvoiceLayer(world, actor) : 1;
            action.present("world_combat:echoedvoice:inhale", echoScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", layer: layer, windup: prepare, crescendo: config && config.crescendo === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const direction = aim(action);
            const target = action.target();
            const targetPos = action.targetPosition();
            const layer = echoedvoiceLayer(world, actor);
            const power = p(echoId, "verse", action);
            const reach = p(echoId, "reach", action);
            const motes = Math.max(4, Math.round(p(echoId, "motes", action)));
            const ringRadius = p(echoId, "ringRadius", action);
            const ticks = Math.max(60, Math.round(p(echoId, "echoTicks", action)));
            const scale = Math.max(0.5, Math.min(2, ringRadius / 0.9));
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const end = targetBody !== null ? targetBody.position() : centre.plus(direction.scale(reach));
            let landed = false, hitPoint = end;

            sound(action, layer > 1 ? "minecraft:block.note_block.chime" : "minecraft:block.note_block.pling");
            WorldFeedback.emit(world, echoScene, 1, centre,
                { moment: "release", path: [[centre.x(), centre.y() + 0.7, centre.z()], [end.x(), end.y() + 0.7, end.z()]],
                    layer: layer, motes: motes, scale: scale }, 28);

            if (target !== null && world.valid(target) && !world.friendly(target) && end.minus(centre).length() <= reach + 0.6) {
                landed = hurt(action, target, echoId, power, { damage: damageSpec(echoId, "verse"), sound: true });
                if (landed) {
                    const at = world.observe(target);
                    hitPoint = at === null ? end : at.position();
                    WorldFeedback.emit(world, echoScene, 1, hitPoint,
                        { moment: "impact", target: String(target.ref()), layer: layer, motes: motes, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, power / 55)) }, 24);
                    sound(action, "minecraft:block.bell.resonate");
                    WorldFeedback.text(world, hitPoint.plus(WorldCombat.point(0, 1.2, 0)),
                        layer > 1 ? echoStackText : echoHitText, [layer], 26);
                }
            }
            // 这一唱把回声留在自己身上：谁接上就从这一层继续叠。先算完威力再留，避免读到自己这一层。
            const marked = CombatStatus.apply(world, actor, echoStatus, echoEffect, ticks, layer - 1, { unique: true });
            if (marked) {
                // 给真实回声载体挂上可数的层数余韵；重唱替换旧标记，随回声身份同寿。
                world.effects(actor, echoMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
                world.effect(echoMark, actor, JSON.stringify({ layer: layer, start: world.tick(), duration: ticks }), ticks);
            }
            if (!landed) {
                WorldFeedback.emit(world, echoScene, 1, end, { moment: "miss", layer: layer, motes: motes, scale: scale }, 20);
                WorldFeedback.text(world, end.plus(WorldCombat.point(0, 1.0, 0)), echoMissText, [], 26);
                sound(action, "minecraft:block.note_block.bass");
            }
            done(action);
        }
    });
}
