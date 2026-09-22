/**
 * 虚张声势 / swagger 的执行组织。
 *
 * 核心念头：贴着对手喊一句最扎心的挑衅，把它的怒火点着。它变得更能打（攻击等级提高），
 * 但每次出手都可能被怒火冲昏——这次出手作废；就算打中了，怒火也反噬它自己，越凶砸得越重。
 * 而且它真的把这股火冲着你来。
 *
 * 出手：短起手（windup 播红怒预告）后提交。
 * 命中：NativeEffects.boost 一条路径把攻击礼物送给任何对象；CombatStatus.apply 挂共享混乱身份
 *       world_combat:status/confusion；world.target 把怪物仇恨拉向施法者。
 * 持续：混乱存续期由本单元的 MobEffect 承担（物品栏可见、/effect 可用），周期性 keep 播放飞鸟。
 * 随机分支：目标每次试图出手（world_combat:before_commit）按 chance 掷骰；中则本次出手作废。
 * 反噬：目标每次打中非友方时（world_combat:damage_applied）按自身攻击结算自伤，让「礼物」变成凶器。
 * 反制：抬高的攻击同样落在施法者与它队友身上；混乱可被共享策略在施加时拒绝（此处仍照给礼物）。
 */
namespace PokemonSkills {
    const swaggerScene = "world_combat:move_swagger";
    const swaggerConfusion = "world_combat:swagger_confusion";
    const swaggerRageText = "world_combat.move.swagger.text.rage";
    const swaggerResistText = "world_combat.move.swagger.text.resist";
    const swaggerRecoilText = "world_combat.move.swagger.text.recoil";

    /** 本招自己的混乱身份：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function swaggerCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === swaggerConfusion ? effect : null;
    }

    define({
        id: "swagger",
        name: "虚张声势",
        description: "激怒对手，使其混乱；因为愤怒，对手的攻击会大幅提高。",
        uses: ["把重击手的火力引向自己", "给难缠的目标制造失手窗口", "在队友集火前先把对手点着"],
        kind: "enemy",
        range: 10,
        prepare: 9,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "taunt",
        defaults: { goad: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["swagger"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("swagger", "telegraph", context)),
                recover: Math.round(p("swagger", "aftermath", context)),
                cooldown: Math.round(p("swagger", "wait", context)),
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_swagger:windup", swaggerScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 10, geometry: "point", style: "taunt", label: "虚张声势" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), caster = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, swaggerScene, 1, action.targetPosition(), { moment: "resist" }, 18);
                done(action);
                return;
            }
            const gift = Math.max(1, Math.min(3, Math.round(p("swagger", "gift", action))));
            const ticks = Math.max(1, Math.round(p("swagger", "duration", action)));
            const chance = Math.max(0.05, Math.min(0.95, p("swagger", "chance", action)));
            NativeEffects.boost(world, target, "atk", gift);
            const landed = CombatStatus.apply(world, target, "confusion", swaggerConfusion, ticks,
                Math.round(chance * 100), { unique: true });
            const targetBody = world.observe(target);
            if (targetBody !== null && !targetBody.player()) world.target(target, caster);
            if (targetBody !== null) {
                const scale = Math.max(0.6, Math.min(2, ticks / 160));
                const burst = Math.round(18 + chance * 90);
                WorldFeedback.emit(world, swaggerScene, 1, targetBody.position(),
                    { moment: "taunt", target: String(target.ref()), gift: gift, burst: burst, scale: scale, intensity: scale }, 34);
                WorldFeedback.text(world, targetBody.position().plus(WorldCombat.point(0, 1, 0)),
                    landed ? swaggerRageText : swaggerResistText, [gift], 44);
                world.sound("minecraft:entity.ravager.roar", targetBody.position(), 18, "{}");
            }
            done(action);
        }
    });


    // 反噬：被点着的目标打中非友方时，按自身攻击结算一道自伤；抬高的攻击让这一下更重。
    WorldCombat.on("world_combat:swagger/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (swaggerCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = swaggerRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, swaggerScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), swaggerRecoilText, [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 混乱存续期：鸟在目标头顶绕，低密度、每 20 刻续期，让出目标本体视线。
    WorldCombat.on("world_combat:swagger/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== swaggerConfusion) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "swagger:" + String(actor.ref()), swaggerScene, 1, body.position(),
            { moment: "dazed", target: String(actor.ref()) }, 20);
    });
}
