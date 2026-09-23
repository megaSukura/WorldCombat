/**
 * 龙锤 / dragonhammer 的出手方式。
 *
 * 核心念头：把整个身体抡起来当锤子——先弓身扬起、再自上而下一记重砸在一个目标身上；砸实的一下把目标
 * 砸得趴伏一阵、走不动几步。没有反震、不裂地，代价是起手慢、只砸一个点。
 *
 * 两幕（落空多一幕）：
 *   起（windup，提交前）：弓身扬起、龙气沿身体收紧，只播预告。
 *   砸（lunge → impact / whiff，提交后）：朝目标补上一步，整个身体自上而下砸下去；进入抡击距离即结算 `hammer`
 *       接触伤害，把目标沿砸击方向撞飞 `shove` 格，并挂上 `world_combat:knocked_down`（共享身份
 *       world_combat:status/knocked_down，移动速度大幅下降）一段时间。目标被让开或擦身而过则砸空。
 *
 * 与同为「身体当武器」的招分开：泰山压顶跃到落点、范围压中一圈、概率麻痹；木槌抬身砸下、裂开地表、反震自己；
 * 龙锤自上而下砸单个目标、不裂地不反震，只把目标砸趴。
 */
namespace PokemonSkills {
    const dragonhammerScene = "world_combat:move_dragonhammer";
    const dragonhammerDowned = "world_combat:knocked_down";
    const dragonhammerHitText = "world_combat.move.dragonhammer.text.hit";
    const dragonhammerMissText = "world_combat.move.dragonhammer.text.miss";

    define({
        id: "dragonhammer",
        cooldownParameter: "recharge",
        name: "Dragon Hammer",
        description: "把整个身体抡起来当锤子，自上而下重砸一个目标：砸中后把它沿砸击方向撞飞、并砸得趴伏一阵、移动大幅变慢。重锤式更重、砸趴更久、把人压在原地；疾锤式起手更快、撞得更远。",
        uses: ["把冲进来的目标砸趴、断它一段走位", "对单个目标打一记重的龙属性接触伤害", "打断贴身后的追击节奏", "把目标撞开、为队友腾出身位"],
        kind: "enemy",
        range: 2.9,
        maxRange: 4.4,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 40,
        style: "hammer",
        maximumTicks: 160,
        defaults: { heavy: true, ai: { maxChase: 6, opening: "anytime" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonhammer", "reach", pokemon), geometry: "circle", style: "hammer",
                color: 0x7078C8, label: config && config.heavy === true ? "重锤式龙锤" : "疾锤式龙锤" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragonhammer"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragonhammer", "tempo", context)),
                recover: Math.round(p("dragonhammer", "aftercast", context)),
                cooldown: Math.round(p("dragonhammer", "recharge", context)),
                active: 0,
                range: p("dragonhammer", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_dragonhammer:rear", dragonhammerScene, 1, action.origin(),
                JSON.stringify({ moment: "rear", scale: body ? (body.width() + body.height()) / 2.3 : 1, heavy: !!(config && config.heavy) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const target = action.target();
            const body = world.observe(self);
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            const aimVec = aim(action);
            function whiff(at: CombatPoint, text: boolean): void {
                WorldFeedback.emit(world, dragonhammerScene, 1, at, { moment: "whiff", scale: scale }, 20);
                if (text) WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), dragonhammerMissText, [], 22);
                sound(action, "minecraft:item.mace.smash_air");
                done(action);
            }
            if (body === null || target === null || !world.valid(target) || world.friendly(target)) {
                whiff(body !== null ? body.position() : action.origin(), false); return;
            }
            const victim = world.observe(target);
            if (victim === null) { whiff(body.position(), false); return; }
            const reach = Math.max(2.0, p("dragonhammer", "reach", action));
            const lunge = Math.max(0, p("dragonhammer", "lunge", action));
            const power = p("dragonhammer", "hammer", action);
            const shove = Math.max(0, p("dragonhammer", "shove", action));
            const downTicks = Math.max(10, Math.round(p("dragonhammer", "downTicks", action)));
            const dust = Math.max(12, Math.round(p("dragonhammer", "dust", action)));
            const from = body.position(), to = victim.position();
            const delta = to.minus(from), distance = delta.length();
            sound(action, "cobblemon:move.dragonclaw.actor");
            if (distance > 0.7) {
                const step = Math.min(lunge, distance - 0.7);
                if (step > 0.05) world.displace(self, delta.unit().scale(step));
            }
            const settled = world.observe(self);
            const here = settled !== null ? settled.position() : from;
            if (here.minus(to).length() > reach + 0.25) { whiff(here, true); return; }
            const landed = hurt(action, target, "dragonhammer", power, { damage: damageSpec("dragonhammer", "hammer"), contact: true });
            if (!landed) { whiff(here, true); return; }
            WorldFeedback.emit(world, dragonhammerScene, 1, to,
                { moment: "impact", target: String(target.ref()), dust: dust, scale: scale,
                    intensity: Math.max(0.6, Math.min(2.2, power / 92)) }, 30);
            world.sound("minecraft:item.mace.smash_ground_heavy", to, 18, "{}");
            if (world.valid(target)) {
                const away = WorldCombat.point(aimVec.x(), 0, aimVec.z());
                if (away.length() > 0.05) world.displace(target, away.unit().scale(shove));
                if (world.valid(target)) MobEffects.apply(world, target, dragonhammerDowned, downTicks, 0);
            }
            WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.3, 0)), dragonhammerHitText, [], 24);
            done(action);
        }
    });
}
