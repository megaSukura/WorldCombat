/**
 * 吹捧 / flatter 的执行组织。
 *
 * 核心念头：把对手夸得找不着北。它被捧得特攻更高、脚下却被钉住一下，满脸得意；
 * 每次想出手都可能走神作废，打中敌人时还会被自己的得意反噬——但这一招几乎不会打空。
 *
 * 出手：短起手（windup 播暖金音符）后提交。
 * 命中：NativeEffects.boost 一条路径把特攻礼物送给任何对象；CombatStatus.apply 挂共享混乱身份
 *       world_combat:status/confusion；WorldEffects.apply 的 world_combat:rooted 把目标钉住一小段。
 * 持续：混乱存续期由本单元的 MobEffect 承担，周期性 keep 播放绕头飞鸟与音符。
 * 随机分支：目标每次试图出手（world_combat:before_commit）按 chance 掷骰；中则本次出手作废。
 * 反噬：目标每次打中非友方时（world_combat:damage_applied）按自身特攻结算自伤。
 * 反制：抬高的特攻同样会打疼施法者；定身很短，不是硬控；混乱可被共享策略在施加时拒绝（礼物照给）。
 */
namespace PokemonSkills {
    const flatterScene = "world_combat:move_flatter";
    const flatterConfusion = "world_combat:flatter_confusion";
    const flatterPraiseText = "world_combat.move.flatter.text.praise";
    const flatterResistText = "world_combat.move.flatter.text.resist";
    const flatterRecoilText = "world_combat.move.flatter.text.recoil";
    const flatterPinText = "world_combat.move.flatter.text.pin";

    /** 本招自己的混乱身份：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function flatterCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === flatterConfusion ? effect : null;
    }

    define({
        id: "flatter",
        name: "吹捧",
        description: "吹捧对手，使其混乱；同时还会提高对手的特攻。",
        uses: ["削弱法术威胁的自控力", "在对手贴身前一瞬把它钉住", "给已经摇摇欲坠的敌人再添一把火"],
        kind: "enemy",
        range: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 140,
        style: "praise",
        defaults: { tone: false, ai: { maxChase: 14, keepAway: 6, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flatter"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("flatter", "telegraph", context)),
                recover: Math.round(p("flatter", "aftermath", context)),
                cooldown: Math.round(p("flatter", "wait", context)),
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_flatter:windup", flatterScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 12, geometry: "point", style: "praise", label: "吹捧" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, flatterScene, 1, action.targetPosition(), { moment: "resist" }, 18);
                done(action);
                return;
            }
            const gift = Math.max(1, Math.min(3, Math.round(p("flatter", "gift", action))));
            const ticks = Math.max(1, Math.round(p("flatter", "duration", action)));
            const chance = Math.max(0.05, Math.min(0.95, p("flatter", "chance", action)));
            const pin = Math.max(1, Math.round(p("flatter", "pin", action)));
            NativeEffects.boost(world, target, "spa", gift);
            const landed = CombatStatus.apply(world, target, "confusion", flatterConfusion, ticks,
                Math.round(chance * 100), { unique: true });
            WorldEffects.apply(world, target, "rooted", {}, pin);
            const targetBody = world.observe(target);
            if (targetBody !== null) {
                const scale = Math.max(0.6, Math.min(2, ticks / 160));
                const burst = Math.round(16 + chance * 80);
                WorldFeedback.emit(world, flatterScene, 1, targetBody.position(),
                    { moment: "praise", target: String(target.ref()), gift: gift, burst: burst, scale: scale, intensity: scale }, 32);
                WorldFeedback.emit(world, flatterScene, 1, targetBody.position().plus(WorldCombat.point(0, -0.5, 0)),
                    { moment: "pin", target: String(target.ref()), pin: pin }, 24);
                WorldFeedback.text(world, targetBody.position().plus(WorldCombat.point(0, 1, 0)),
                    landed ? flatterPraiseText : flatterResistText, [gift], 42);
                WorldFeedback.text(world, targetBody.position().plus(WorldCombat.point(0, 0.4, 0)), flatterPinText, [], 26);
                world.sound("minecraft:block.amethyst_block.chime", targetBody.position(), 16, "{}");
            }
            done(action);
        }
    });


    // 反噬：被吹捧的目标打中非友方时，按自身特攻结算一道自伤；抬高的特攻让这一下更重。
    WorldCombat.on("world_combat:flatter/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (flatterCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.spa || 0;
        const fraction = flatterRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, flatterScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), flatterRecoilText, [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 陶醉存续期：飞鸟与音符在目标头顶绕，低密度、每 20 刻续期，让出目标本体视线。
    WorldCombat.on("world_combat:flatter/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== flatterConfusion) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "flatter:" + String(actor.ref()), flatterScene, 1, body.position(),
            { moment: "dazed", target: String(actor.ref()) }, 20);
    });
}
