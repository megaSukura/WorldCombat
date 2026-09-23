/**
 * 瞬间失忆 / amnesia — 执行组织。
 *
 * 核心念头：把脑子腾空——思念像尘一样被排出去，特防大幅抬起来，缠着心智的东西也一并忘掉。
 *   它是本族唯一只抬特防、也是唯一会清掉自身异常的一招。
 *
 * 两幕：
 *   排空（windup 播「放空」，提交前只观察与预告，打断不花代价）。
 *   空明（提交后）：临时特防等级（poise 级）跟随共享身份
 *     world_combat:status/amnesia 的空明窗口；随后按配置数量，
 *     用 CombatStatus.cure 按共享身份忘掉缠绕心智的状态（混乱／着迷／挑衅／无理取闹／被点名等）。
 * 结束：空明窗口走完或被清除时，结束这份特防贡献。
 *
 * 忘却名单是共享身份，不是本单元的效果 id：别的单元以后发明的心智类异常，只要打同一个
 * world_combat:status/<名> 标签，这里就能忘掉。
 */
namespace PokemonSkills {
    const amnesiaScene = "world_combat:move_amnesia";
    const amnesiaBlank = "world_combat:amnesia_blank";
    const amnesiaSettleText = "world_combat.move.amnesia.text.blank";
    const amnesiaCalmText = "world_combat.move.amnesia.text.calm";
    const amnesiaFadeText = "world_combat.move.amnesia.text.fade";
    /** 表现里的参考半径：`data.scale = 实际空明半径 / 这个数`。 */
    const amnesiaReferenceRadius = 1.4;
    /** 缠绕心智的共享身份，按「最碍事的先忘」排序；与生产方无关，只按 tag 读。 */
    const amnesiaMental = ["confusion", "attract", "taunt", "torment", "encore", "disable"];

    /** 忘掉至多 `limit` 个缠绕心智的状态，返回实际忘掉的个数。 */
    function amnesiaForget(world: CombatWorld, actor: CombatActor, limit: number): number {
        let forgot = 0;
        for (let index = 0; index < amnesiaMental.length && forgot < limit; index++) {
            const name = amnesiaMental[index];
            if (!CombatStatus.has(world, actor, name)) continue;
            if (CombatStatus.cure(world, actor, name)) forgot++;
        }
        return forgot;
    }

    define({
        id: "amnesia",
        cooldownParameter: "wait",
        name: "瞬间失忆",
        description: "短时提高特防，并按顺序清除混乱、着迷、挑衅、无理取闹、再来一次和定身法；空明结束时收回本招的特防强化。",
        uses: ["被混乱、着迷一类状态缠住时当场忘掉它们", "顶特殊火力前把特防垫到最高", "拉锯里用一时失神随手补一档特防"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 95,
        style: "void",
        stationary: true,
        defaults: { deep: true, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("deep", "彻底失忆")],
        indicator: function (config, pokemon) {
            return { radius: p("amnesia", "void", pokemon), geometry: "area", style: "void", color: 0xDCEBFF,
                label: config && config.deep !== false ? "瞬间失忆 · 彻底" : "瞬间失忆 · 一时" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["amnesia"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("amnesia", "tempo", context)),
                recover: Math.round(p("amnesia", "aftercast", context)),
                cooldown: Math.round(p("amnesia", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_amnesia:release", amnesiaScene, 1, action.origin(),
                JSON.stringify({ moment: "release", deep: config && config.deep !== false ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const deep = !(config && config.deep === false);
            const poise = Math.max(2, Math.min(3, Math.round(p("amnesia", "poise", action))));
            const window = Math.max(120, Math.round(p("amnesia", "blank", action)));
            const radius = Math.max(0.6, p("amnesia", "void", action));
            const motes = Math.max(12, Math.round(p("amnesia", "motes", action)));
            const rings = Math.max(2, Math.min(4, Math.round(p("amnesia", "rings", action))));
            const purge = Math.max(1, Math.min(6, Math.round(p("amnesia", "purge", action))));
            const scale = radius / amnesiaReferenceRadius;
            const before = NativeEffects.effectiveStage(world, actor, "spd"), previous = MobEffects.read(world, actor, amnesiaBlank);
            const carrier = MobEffects.apply(world, actor, amnesiaBlank, window, previous ? previous.amplifier() : 0), contribution = "world_combat:move/amnesia";
            let levels = 0;
            if (carrier) {
                NativeEffects.boostWindow(world, actor, { spd: poise }, carrier.duration(), contribution, carrier, previous);
                levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "spd") - before);
                if (carrier.amplifier() !== levels) {
                    const shown = MobEffects.apply(world, actor, amnesiaBlank, window, levels);
                    if (shown) NativeEffects.boostWindow(world, actor, {}, shown.duration(), contribution, shown, carrier);
                }
            }
            const forgot = amnesiaForget(world, actor, purge);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, amnesiaScene, 1, feet,
                { moment: "blank", actor: String(actor.ref()), poise: levels, forgot: forgot, motes: motes, rings: rings,
                    scale: scale, deep: deep ? 1 : 0, intensity: Math.max(0.8, Math.min(1.8, 0.6 + levels / 3 + forgot * 0.15)) }, 34);
            WorldFeedback.keep(world, "amnesia:blank:" + String(actor.ref()), amnesiaScene, 1, body.position(),
                { moment: "sustain", actor: String(actor.ref()), motes: motes, rings: rings, scale: scale }, Math.min(window, 220));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.35, 0)),
                forgot > 0 ? amnesiaSettleText : amnesiaCalmText, forgot > 0 ? [levels, forgot, Math.round(window / 20)] : [levels, Math.round(window / 20)], 32);
            world.sound("cobblemon:move.psychic.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 特防贡献随空明窗口结束；移除事件只负责收尾表现。
    WorldCombat.on("world_combat:move_amnesia/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== amnesiaBlank) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, amnesiaBlank)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, amnesiaScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), amnesiaFadeText, [], 22);
    });
}
