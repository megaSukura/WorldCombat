/**
 * 吹捧 / flatter 的执行组织。
 *
 * 核心念头：把对手夸得找不着北。它被捧得特攻更高、满脸得意；每次想出手都可能走神作废，
 * 但它不会被钉住——脚步始终自由，代价是把它的特攻礼物送给了敌人。
 *
 * 出手：短起手（windup 播暖金音符）后提交。
 * 命中：NativeEffects.boost 一条路径把特攻礼物送给任何对象，浮字显示这次真正加到的等级差；
 *       CombatStatus.apply 挂共享混乱身份 world_combat:status/confusion。没有定身，也没有命中后的百分比自伤。
 * 分幕：礼物本身在命中时炸开；目标平时照常移动，只在它真的准备出手时冒一枚轻音符，出手被混乱打散时音符散成乱拍。
 *   脚本招式的出手由 world_combat:committed 记录，普通 MC 攻击由真实的 world_combat:damage_applied 回执记录，两者同景。
 * 走神：共享 CombatStatus.actions 的门禁在 before_commit 与原生攻击命中时掷骰；本单元只在 action_rejected 回执里补表现。
 * 反制：抬高的特攻会打疼施法者；混乱可被共享策略在施加时拒绝（礼物照给，所以 AI 对免疫混乱的目标直接放弃这一手）。
 * 语音：这是一句隔空/当面的奉承，不要求执行视线；伙伴只对看得见的目标起意，得不到全图感知。
 */
namespace PokemonSkills {
    const flatterScene = "world_combat:move_flatter";
    const flatterConfusion = "world_combat:flatter_confusion";
    const flatterPraiseText = "world_combat.move.flatter.text.praise";
    const flatterResistText = "world_combat.move.flatter.text.resist";

    /** 本招自己的混乱身份：只有当代表载体就是本单元的 id 时，本单元的表现才接管。 */
    function flatterCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === flatterConfusion ? effect : null;
    }

    /** 陶醉中的目标真的出手一次：头顶冒一枚轻音符，音数反映当前被抬高的特攻——脚本与普通攻击共用这一幕。 */
    function flatterStir(world: CombatWorld, actor: CombatActor): void {
        if (!world.valid(actor) || flatterCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const boost = Math.max(1, Math.round(NativeEffects.effectiveStage(world, actor, "spa")));
        WorldFeedback.emit(world, flatterScene, 1, body.position(), { moment: "stir", target: String(actor.ref()), boost: boost }, 18);
    }

    define({
        id: "flatter",
        cooldownParameter: "wait",
        name: "吹捧",
        description: "吹捧对手，抬高它的特攻并让它陷入陶醉：每次出手可能走神作废；它始终能自由移动。礼物是代价，所以更适合压制本来就不靠特攻的物理威胁；对混乱免疫的目标伙伴不会使用。",
        uses: ["让不靠特攻的物理威胁频频走神", "压住一只近战强攻的出手节奏", "给已经摇摇欲坠的敌人再添一把火"],
        kind: "enemy",
        range: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 140,
        style: "praise",
        defaults: { tone: false, ai: { maxChase: 14, leaveStation: false } },
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
            // 浮字与表现都显示这次真正加到的等级差：被等级上限吃掉的礼物如实反映。
            const giftDelta = NativeEffects.boost(world, target, "spa", gift);
            const landed = CombatStatus.apply(world, target, "confusion", flatterConfusion, ticks,
                Math.round(chance * 100), { unique: true });
            const targetBody = world.observe(target);
            if (targetBody !== null) {
                const scale = Math.max(0.6, Math.min(2, ticks / 160));
                const burst = Math.round(16 + chance * 80);
                WorldFeedback.emit(world, flatterScene, 1, targetBody.position(),
                    { moment: "praise", target: String(target.ref()), gift: giftDelta, burst: burst, scale: scale, intensity: scale }, 32);
                WorldFeedback.text(world, targetBody.position().plus(WorldCombat.point(0, 1, 0)),
                    landed ? flatterPraiseText : flatterResistText, [giftDelta], 42);
                world.sound("minecraft:block.amethyst_block.chime", targetBody.position(), 16, "{}");
                if (!landed) WorldFeedback.emit(world, flatterScene, 1, targetBody.position(), { moment: "resist" }, 18);
            }
            done(action);
        }
    });


    // 走神存续期：目标准备出手时冒一枚轻音符，音符数量反映被抬高的特攻——不画脚钉、不钉住它。
    WorldCombat.on("world_combat:move_flatter/stir", "world_combat:committed", "", function (event) {
        flatterStir(event.world(), event.actor());
    });

    // 普通 MC 攻击（非宝可梦）成功命中时，用同一真实攻击回执补同等陶醉反馈；脚本招式由上面 committed 承担。
    WorldCombat.on("world_combat:move_flatter/native", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.domain()) === "cobblemon") return;
        if (String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0) || !DamageSemantics.read(data).attack) return;
        flatterStir(world, actor);
    });

    // 实际失误：共享门禁把这次出手判给混乱时，音符散成乱拍（走神，不是反噬伤害）。
    CombatStatus.rejected.define({ id: "world_combat:move_flatter/fumble", apply: function (context) {
        if (context.status !== "confusion") return;
        const carrier = context.details && context.details.effect !== undefined ? String(context.details.effect) : "";
        if (carrier && carrier !== flatterConfusion) return;
        const world = context.world, actor = context.actor;
        if (!world.valid(actor) || flatterCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, flatterScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()) }, 22);
        world.sound("minecraft:block.note_block.didgeridoo", body.position(), 12, "{}");
    } });
}
