/**
 * 天使之吻 / sweetkiss — 执行组织。
 *
 * 核心念头：凑到对手脸前，送上一口天真到让人失神的吻；被亲到的人从此心猿意马，出手会打偏、
 * 用力会伤到自己。它不隔空、不远射——够不到就亲空，所以走位是它的读法。
 *
 * 出手：贴到亲吻距离内才能提交；ready 复核目标是否还在、是否够得到，够不到就作废（不花 PP）。
 * 命中：在目标身上炸开一团心，挂共享身份 world_combat:status/confusion 的 world_combat:sweetkiss_blush。
 * 持续：混乱存续期由该 MobEffect 承担，周期性 keep 播放头顶的心与飞鸟。
 * 随机分支：目标每次试图出手（world_combat:before_commit）按载体振幅掷骰；中则本次出手作废。
 * 反噬：目标每次打中非友方（world_combat:damage_applied）按自身攻击结算自伤。
 * 反制：距离是硬门槛；目标跑开、被队友挡开或自己够不到都亲空。已有混乱只被刷新，不叠加。
 */
namespace PokemonSkills {
    function sweetkissAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function sweetkissCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === sweetkissEffect ? effect : null;
    }

    define({
        id: sweetkissId,
        cooldownParameter: "recharge",
        name: "天使之吻",
        description: "近身使目标混乱：其出手可能作废，打中敌人时还会被自己的力量反噬。亲密度越高，混乱持续越久。",
        uses: ["贴身把对手亲懵", "为队友的集火制造失手窗口", "在缠斗中让对手的连招不断失手"],
        kind: "enemy",
        range: 4,
        maxRange: 4,
        prepare: 14,
        active: 1,
        recover: 8,
        cooldown: 80,
        style: "kiss",
        defaults: { kiss: "light" },
        fields: [
            choice("kiss", "吻的方式", ["light", "deep"], ["轻吻", "深吻"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sweetkissId], detail: { values: config }, world, actor, attributes };
            const deep = config.kiss === "deep";
            return {
                prepare: Math.round(p(sweetkissId, "tempo", context)) + (deep ? 6 : 0),
                recover: Math.round(p(sweetkissId, "aftercast", context)) + (deep ? 4 : 0),
                cooldown: Math.round(p(sweetkissId, "recharge", context) * (deep ? 1.15 : 0.9)),
                range: Math.max(2.6, Math.min(4, p(sweetkissId, "kissReach", context))),
                active: 1
            };
        },
        ready: function (action, config) {
            const target = action.target(), world = action.sense();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            return body.position().minus(action.origin()).length() > action.range() + 0.25 ? "out-of-range" : "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_sweetkiss:windup", sweetkissScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: any = { pokemon, skill: skills[sweetkissId], detail: { values: config } };
            const reach = pokemon ? p(sweetkissId, "kissReach", context) : 3;
            return { radius: reach, geometry: "circle", style: "kiss", color: 0xFF8FB8, label: "天使之吻" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, sweetkissScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const deep = config.kiss === "deep";
            const body = world.observe(target);
            const at = body === null ? action.targetPosition() : body.position();
            const ticks = Math.max(20, Math.round(p(sweetkissId, "mistTicks", action) * (deep ? 1.3 : 0.8)));
            const chance = Math.max(0.05, Math.min(0.9, sweetkissBaseChance + (deep ? 0.1 : 0)));
            const hearts = Math.max(1, Math.round(p(sweetkissId, "hearts", action)));
            CombatStatus.apply(world, target, "confusion", sweetkissEffect, ticks, Math.round(chance * 100), { unique: true });
            WorldFeedback.emit(world, sweetkissScene, 1, at,
                { moment: "kiss", target: String(target.ref()), hearts: hearts, scale: Math.max(0.6, Math.min(2, ticks / 180)) }, 40);
            WorldFeedback.text(world, sweetkissAbove(at), "world_combat.move.sweetkiss.text.kissed", [Math.round(ticks / 20)], 44);
            sound(action, "minecraft:entity.allay.item_given");
            done(action);
        }
    });


    // 反噬：心猿意马的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_sweetkiss/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (sweetkissCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = sweetkissRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, sweetkissScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, sweetkissAbove(body.position()), "world_combat.move.sweetkiss.text.recoil", [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 混乱存续期：低密度的心与飞鸟每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_sweetkiss/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== sweetkissEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "sweetkiss:" + String(actor.ref()), sweetkissScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
