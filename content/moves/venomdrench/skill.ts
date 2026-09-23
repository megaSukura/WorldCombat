/**
 * 毒液陷阱 / venomdrench 的出手方式。
 *
 * 核心念头：以自身为圆心**泼出一整圈黏稠毒液**——只有已经被毒浸透的人才会被这层毒液黏住手脚与喉咙，
 *   攻击、特攻、速度一起变钝；没中毒的人只是被淋湿一层、毫发无伤。它是这一族里唯一只对对手生效、
 *   且唯一以对方中毒状态为门槛的招。
 *
 * 两幕：
 *   起（windup，提交前）：身上浮起一层黏稠的毒光、滴落；可被打断，打断不消耗任何东西。
 *   泼（提交后）：以自身为心张开 spread 的一圈，凡圈内非友方都被泼到——
 *     · 带着共享身份 world_combat:status/poison（含剧毒）的：攻击、特攻、速度各 −drop，并挂上共享身份
 *       world_combat:status/drenched 的印记；
 *     · 没中毒的：只播“被淋湿”的一幕，不产生任何数值变化。
 *
 * 与同族分开：酸液炸弹贴脸喷酸、掉的是特防且一定命中；毒液陷阱**只对已经中毒者生效**，一次削三项，是
 *   「先下毒、再收割」那一半的招。
 */
namespace PokemonSkills {
    const venomdrenchScene = "world_combat:move_venomdrench";
    const venomdrenchDrench = "world_combat:venomdrench_drench";
    const venomdrenchDrenchedText = "world_combat.move.venomdrench.text.drenched";
    const venomdrenchWashedText = "world_combat.move.venomdrench.text.washed";
    /** 表现里的参考半径：`data.scale = 实际泼洒半径 / 这个数`。 */
    const venomdrenchReference = 4.0;

    define({
        id: "venomdrench",
        cooldownParameter: "wait",
        name: "毒液陷阱",
        description: "朝身周泼出一整圈黏稠毒液：圈里已经被毒浸透的对手，攻击、特攻、速度一起下降；没中毒的人只是被淋湿一层、不受影响。深泼削得更狠但范围更小、出手更慢；浅泼范围更大、出手更快。",
        uses: ["先下毒再收割，把中毒的对手一次削软三项", "在敌人扎堆时一次黏住几个中毒的", "贴住一个中毒的硬目标深泼两档"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 70,
        style: "venom",
        defaults: { deep: false, ai: { maxChase: 8, minFoes: 1 } },
        fields: [flag("deep", "深泼")],
        indicator: function (config, pokemon) {
            return { radius: p("venomdrench", "spread", pokemon), geometry: "circle", style: "venom", color: 0x9A5CC8,
                label: config && config.deep ? "毒液陷阱 · 深泼" : "毒液陷阱" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["venomdrench"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("venomdrench", "tempo", context)),
                recover: Math.round(p("venomdrench", "aftercast", context)),
                cooldown: Math.round(p("venomdrench", "wait", context)),
                active: 1,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_venomdrench:gather", venomdrenchScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(2, Math.round(p("venomdrench", "drop", action))));
            const spread = Math.max(2.0, Math.min(7.5, p("venomdrench", "spread", action)));
            const drops = Math.max(12, Math.round(p("venomdrench", "drops", action)));
            const spray = Math.max(0.05, p("venomdrench", "spray", action));
            const linger = Math.max(40, Math.round(p("venomdrench", "linger", action)));
            const scale = spread / venomdrenchReference;
            let drenched = 0, washed = 0;

            sound(action, "cobblemon:move.sludgebomb.actor");
            // 毒液不看视线：泼出去的一圈罩住就走。
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, spread, { below: 2, above: 3 }), function (actor, facts) {
                if (facts.friendly()) return;
                const ref = String(actor.ref());
                if (CombatStatus.has(world, actor, "poison")) {
                    NativeEffects.boost(world, actor, "atk", -drop);
                    NativeEffects.boost(world, actor, "spa", -drop);
                    NativeEffects.boost(world, actor, "spe", -drop);
                    MobEffects.apply(world, actor, venomdrenchDrench, linger, drop);
                    drenched++;
                    WorldFeedback.emit(world, venomdrenchScene, 1, facts.position(),
                        { moment: "drenched", target: ref, drop: drop, drops: drops, spread: spread, scale: scale,
                            intensity: Math.max(0.8, Math.min(2.2, drop + drops / 40)) }, 26);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), venomdrenchDrenchedText, [drop], 28);
                } else {
                    washed++;
                    WorldFeedback.emit(world, venomdrenchScene, 1, facts.position(),
                        { moment: "washed", target: ref, drops: Math.max(6, Math.round(drops / 3)), spread: spread, scale: scale }, 20);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), venomdrenchWashedText, [], 24);
                }
            });
            WorldFeedback.emit(world, venomdrenchScene, 1, origin,
                { moment: "splash", actor: String(self.ref()), drop: drop, drops: drops, spread: spread, spray: spray, scale: scale,
                    drenched: drenched, washed: washed, intensity: Math.max(0.8, Math.min(2.2, drops / 30)) }, 30);
            if (drenched > 0) sound(action, "cobblemon:move.sludgebomb.target");
            else if (washed > 0) sound(action, "minecraft:entity.generic.splash");
            done(action);
        }
    });

    // 「被淋透」印记存续期间：每 6 刻在目标身上滴落一次毒液（低密度，让出视线）。
    WorldCombat.on("world_combat:move_venomdrench/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== venomdrenchDrench || event.world().tick() % 6 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, venomdrenchDrench) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_venomdrench/drip/" + String(actor.ref()), venomdrenchScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
